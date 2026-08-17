#[derive(Debug, Clone)]
#[derive(serde::Serialize, serde::Deserialize)]
pub struct BoardMood {
    pub state: BoardMoodState,
}

impl BoardMood {
    pub fn default() -> Self {
        BoardMood {
            state: BoardMoodState::Normal,
        }
    }
}

#[derive(Debug, Clone)]
#[derive(serde::Serialize, serde::Deserialize)]
pub enum BoardMoodState {
    Poor,
    Normal,
    Good,
    Excellent,
}
