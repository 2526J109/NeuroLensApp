import joblib
import pandas as pd
import numpy as np

# ── Prior-probability correction ─────────────────────────────────────────────
# The UCI Parkinson's dataset is ~75 % positive (147/195 samples have PD).
# This causes the model to over-predict risk even for healthy voices.
# We correct the raw output probability back toward a balanced 50/50 prior
# using Bayes' theorem (frequency-weighting / prior correction).
_TRAINING_PRIOR = 0.75   # positive-class fraction in the training set
_TARGET_PRIOR   = 0.50   # desired prior (balanced / unbiased)


class ParkinsonsMultimodalPredictor:
    def __init__(self, model_path):
        package = joblib.load(model_path)
        self.acoustic_model = package['acoustic_model']
        self.linguistic_model = package['linguistic_model']
        self.acoustic_scaler = package['acoustic_scaler']
        self.linguistic_scaler = package['linguistic_scaler']
        self.w_lang = package['fusion_weights']['linguistic']
        self.w_acou = package['fusion_weights']['acoustic']

        # All columns each scaler was fit on (may be a superset of model features)
        self.acoustic_scaler_cols = list(
            getattr(self.acoustic_scaler, 'feature_names_in_', [])
        )
        self.linguistic_scaler_cols = list(
            getattr(self.linguistic_scaler, 'feature_names_in_', [])
        )

        # Columns the SVC model itself was trained on (the 10 / 13 that matter)
        self.acoustic_model_cols = list(
            getattr(self.acoustic_model, 'feature_names_in_', self.acoustic_scaler_cols)
        )
        self.linguistic_model_cols = list(
            getattr(self.linguistic_model, 'feature_names_in_', self.linguistic_scaler_cols)
        )

    def _align(self, df: pd.DataFrame, expected_cols: list) -> pd.DataFrame:
        """Reindex df to exactly match expected_cols, filling missing with 0."""
        if not expected_cols:
            return df
        return df.reindex(columns=expected_cols, fill_value=0.0)

    @staticmethod
    def _correct_prior(p: float,
                       train_prior: float = _TRAINING_PRIOR,
                       target_prior: float = _TARGET_PRIOR) -> float:
        """
        Bayesian prior-probability correction.

        Adjusts a raw model probability `p` that was calibrated on a dataset
        with class prevalence `train_prior` to instead reflect `target_prior`.

        Formula (frequency-weighting):
            p_corr = (p / q_train) / (p / q_train + (1-p) / (1 - q_train))
        where q_train = train_prior / target_prior  (likelihood ratio weight)
        """
        eps = 1e-7
        p = float(np.clip(p, eps, 1 - eps))
        # Likelihood-ratio scaling
        w = (train_prior / target_prior)
        p_corr = (p / w) / (p / w + (1 - p) / (1 - train_prior) * (1 - target_prior))
        return float(np.clip(p_corr, 0.0, 1.0))

    def predict_risk(self, acoustic_features_df, linguistic_features_df):
        # 1. Pad input to all scaler columns (scaler expects every column it was fit on)
        acou_aligned = self._align(acoustic_features_df, self.acoustic_scaler_cols)
        lang_aligned = self._align(linguistic_features_df, self.linguistic_scaler_cols)

        # 2. Scale — outputs a numpy array with len(scaler_cols) values
        acou_scaled_arr = self.acoustic_scaler.transform(acou_aligned)
        lang_scaled_arr = self.linguistic_scaler.transform(lang_aligned)

        # 3. Convert back to DataFrame so we can select the columns the SVC needs
        acou_scaled_df = pd.DataFrame(acou_scaled_arr, columns=self.acoustic_scaler_cols)
        lang_scaled_df = pd.DataFrame(lang_scaled_arr, columns=self.linguistic_scaler_cols)

        # 4. Select only the features the SVC model was trained on
        acou_final = acou_scaled_df[self.acoustic_model_cols]
        lang_final = lang_scaled_df[self.linguistic_model_cols]

        # 5. Raw model probabilities
        p_acou = self.acoustic_model.predict_proba(acou_final)[:, 1]
        p_lang = self.linguistic_model.predict_proba(lang_final)[:, 1]

        # 6. Weighted fusion
        raw_prob = float((self.w_acou * p_acou + self.w_lang * p_lang)[0])

        # 7. Prior-probability correction (debias the 75 % training imbalance)
        final_prob = self._correct_prior(raw_prob)

        risk_percentage = round(final_prob * 100, 2)
        category = "Low Risk" if risk_percentage < 45 else "Moderate Risk" if risk_percentage < 70 else "High Risk"
        return {"risk_percentage": f"{risk_percentage:.2f}%", "risk_category": category}
