#[derive(Debug, Clone)]
#[derive(serde::Serialize, serde::Deserialize)]
pub enum ClubStatus {
    Amateur,
    SemiProfessional,
    Professional,
}
