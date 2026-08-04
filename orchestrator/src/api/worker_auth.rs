use axum::{
    extract::{Request, State},
    http::{HeaderMap, StatusCode, header::AUTHORIZATION},
    middleware::Next,
    response::Response,
};
use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;

pub const WORKER_AUTH_TOKEN_ENV: &str = "RELAYFOLD_WORKER_AUTH_TOKEN";

#[derive(Clone)]
pub struct WorkerAuth {
    token_digest: [u8; 32],
}

impl WorkerAuth {
    pub fn from_token(token: &str) -> anyhow::Result<Self> {
        if !is_valid_token(token) {
            anyhow::bail!(
                "{WORKER_AUTH_TOKEN_ENV} is required and must be a non-empty bearer token"
            );
        }

        Ok(Self {
            token_digest: Sha256::digest(token.as_bytes()).into(),
        })
    }

    pub fn from_env() -> anyhow::Result<Self> {
        Self::from_config(|name| std::env::var(name).ok())
    }

    fn from_config(mut read: impl FnMut(&str) -> Option<String>) -> anyhow::Result<Self> {
        let token = read(WORKER_AUTH_TOKEN_ENV)
            .ok_or_else(|| anyhow::anyhow!("{WORKER_AUTH_TOKEN_ENV} is required"))?;
        Self::from_token(&token)
    }

    fn authenticates(&self, headers: &HeaderMap) -> bool {
        let mut values = headers.get_all(AUTHORIZATION).iter();
        let Some(value) = values.next() else {
            return false;
        };
        if values.next().is_some() {
            return false;
        }

        let Ok(value) = value.to_str() else {
            return false;
        };
        let Some((scheme, credential)) = value.split_once(' ') else {
            return false;
        };
        if !scheme.eq_ignore_ascii_case("Bearer") || !is_valid_token(credential) {
            return false;
        }

        let supplied_digest: [u8; 32] = Sha256::digest(credential.as_bytes()).into();
        bool::from(self.token_digest.ct_eq(&supplied_digest))
    }
}

pub async fn require_worker_auth(
    State(auth): State<WorkerAuth>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    if !auth.authenticates(request.headers()) {
        return Err(StatusCode::UNAUTHORIZED);
    }

    Ok(next.run(request).await)
}

fn is_valid_token(value: &str) -> bool {
    !value.is_empty()
        && value.bytes().all(|byte| {
            byte.is_ascii_alphanumeric()
                || matches!(byte, b'-' | b'.' | b'_' | b'~' | b'+' | b'/' | b'=')
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_missing_empty_whitespace_and_invalid_tokens_without_echoing_values() {
        for token in ["", " ", "secret token", "secret:token"] {
            let error = WorkerAuth::from_token(token).err().unwrap().to_string();
            assert_eq!(
                error,
                "RELAYFOLD_WORKER_AUTH_TOKEN is required and must be a non-empty bearer token"
            );
        }
    }

    #[test]
    fn accepts_url_safe_token() {
        WorkerAuth::from_token("high-entropy_token.123~").unwrap();
    }

    #[test]
    fn required_startup_config_rejects_missing_and_blank_values() {
        assert_eq!(
            WorkerAuth::from_config(|_| None).err().unwrap().to_string(),
            "RELAYFOLD_WORKER_AUTH_TOKEN is required"
        );
        for token in ["", "   "] {
            assert!(WorkerAuth::from_config(|_| Some(token.to_string())).is_err());
        }
    }
}
