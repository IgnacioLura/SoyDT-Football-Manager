use serde::{Deserialize, Serialize};

use super::compiled::compiled;

#[derive(Serialize, Deserialize, Clone)]
pub struct ContinentEntity {
    pub id: u32,
    pub name: String,
}

pub struct ContinentLoader;

impl ContinentLoader {
    pub fn load() -> Vec<ContinentEntity> {
        compiled().continents.clone()
    }
}
