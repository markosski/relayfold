use async_trait::async_trait;
use serde::{Deserialize, Deserializer, Serialize, Serializer, de};
use std::{fmt, str::FromStr, sync::Arc};
use uuid::Uuid;

use crate::ports::storage::StoragePort;

pub const GLOBAL_NAMESPACE: &str = "global-namespace";

#[derive(Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub struct Namespace(String);

impl Namespace {
    pub fn new(value: impl Into<String>) -> Result<Self, NamespaceError> {
        let value = value.into();
        if value == GLOBAL_NAMESPACE {
            return Ok(Self(value));
        }

        let parsed = Uuid::parse_str(&value).map_err(|_| NamespaceError)?;

        if parsed.hyphenated().to_string() != value {
            return Err(NamespaceError);
        }

        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for Namespace {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.0)
    }
}

impl FromStr for Namespace {
    type Err = NamespaceError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        Self::new(value)
    }
}

impl Serialize for Namespace {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.as_str())
    }
}

impl<'de> Deserialize<'de> for Namespace {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        Self::new(value).map_err(de::Error::custom)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct NamespaceError;

impl fmt::Display for NamespaceError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .write_str("namespace must be global-namespace or a UUID in canonical hyphenated form")
    }
}

impl std::error::Error for NamespaceError {}

#[cfg(test)]
pub fn test_namespace() -> Namespace {
    Namespace::new("550e8400-e29b-41d4-a716-446655440000").unwrap()
}

#[derive(Clone)]
pub struct NamespaceResolver {
    storage: Arc<dyn StoragePort + Send + Sync>,
}

impl NamespaceResolver {
    pub fn new(storage: Arc<dyn StoragePort + Send + Sync>) -> Self {
        Self { storage }
    }

    async fn resolve_with_global_setting_value(
        &self,
        api_key: Option<&str>,
        use_global_namespace: Option<String>,
    ) -> anyhow::Result<Namespace> {
        if use_global_namespace_from_value(use_global_namespace)? {
            return Ok(Namespace::new(GLOBAL_NAMESPACE)?);
        }

        let _api_key = api_key.ok_or_else(|| anyhow::anyhow!("bearer credential is required"))?;
        let _storage = self.storage.as_ref();
        todo!("API-key namespace resolution is not implemented")
    }
}

#[async_trait]
pub trait NamespaceResolverPort {
    async fn resolve(&self, api_key: Option<&str>) -> anyhow::Result<Namespace>;
}

#[async_trait]
impl NamespaceResolverPort for NamespaceResolver {
    async fn resolve(&self, api_key: Option<&str>) -> anyhow::Result<Namespace> {
        self.resolve_with_global_setting_value(
            api_key,
            std::env::var("RELAYFOLD_USE_GLOBAL_NAMESPACE").ok(),
        )
        .await
    }
}

fn use_global_namespace_from_value(value: Option<String>) -> anyhow::Result<bool> {
    match value.as_deref() {
        None | Some("false") => Ok(false),
        Some("true") => Ok(true),
        Some(_) => anyhow::bail!("RELAYFOLD_USE_GLOBAL_NAMESPACE must be true or false"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::adapters::memory_storage::MemoryStorage;

    const NAMESPACE: &str = "550e8400-e29b-41d4-a716-446655440000";

    #[test]
    fn accepts_and_serializes_canonical_uuid_string() {
        let namespace = Namespace::new(NAMESPACE).unwrap();

        assert_eq!(namespace.as_str(), NAMESPACE);
        assert_eq!(namespace.to_string(), NAMESPACE);
        assert_eq!(
            serde_json::to_string(&namespace).unwrap(),
            format!("\"{NAMESPACE}\"")
        );
        assert_eq!(
            serde_json::from_str::<Namespace>(&format!("\"{NAMESPACE}\"")).unwrap(),
            namespace
        );
    }

    #[test]
    fn accepts_and_serializes_global_namespace() {
        let namespace = Namespace::new(GLOBAL_NAMESPACE).unwrap();

        assert_eq!(namespace.as_str(), GLOBAL_NAMESPACE);
        assert_eq!(
            serde_json::from_str::<Namespace>("\"global-namespace\"").unwrap(),
            namespace
        );
    }

    #[test]
    fn rejects_noncanonical_or_invalid_uuid_strings() {
        for value in [
            "",
            "default",
            "550e8400e29b41d4a716446655440000",
            "550E8400-E29B-41D4-A716-446655440000",
            "{550e8400-e29b-41d4-a716-446655440000}",
            "550e8400-e29b-41d4-a716-44665544000z",
        ] {
            assert_eq!(Namespace::new(value), Err(NamespaceError), "{value}");
        }
    }

    #[test]
    fn deserialization_rejects_invalid_uuid_string() {
        assert!(serde_json::from_str::<Namespace>("\"default\"").is_err());
    }

    #[test]
    fn global_namespace_setting_defaults_to_false_when_missing() {
        assert!(!use_global_namespace_from_value(None).unwrap());
        assert!(!use_global_namespace_from_value(Some("false".to_string())).unwrap());
    }

    #[test]
    fn global_namespace_setting_rejects_non_boolean_values() {
        for value in ["", "TRUE", "yes", "1", "global-namespace"] {
            assert!(
                use_global_namespace_from_value(Some(value.to_string())).is_err(),
                "{value}"
            );
        }
    }

    #[tokio::test]
    async fn enabled_global_namespace_ignores_api_key() {
        let resolver = NamespaceResolver::new(Arc::new(MemoryStorage::new()));

        let namespace = resolver
            .resolve_with_global_setting_value(Some("unrelated-api-key"), Some("true".to_string()))
            .await
            .unwrap();

        assert_eq!(namespace.as_str(), GLOBAL_NAMESPACE);
    }

    #[tokio::test]
    #[should_panic(expected = "API-key namespace resolution is not implemented")]
    async fn api_key_resolution_panics_as_not_implemented() {
        let resolver = NamespaceResolver::new(Arc::new(MemoryStorage::new()));
        let _ = resolver
            .resolve_with_global_setting_value(Some("api-key"), Some("false".to_string()))
            .await;
    }
}
