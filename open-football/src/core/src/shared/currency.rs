#[derive(Debug, Clone)]
#[derive(serde::Serialize, serde::Deserialize)]
pub struct CurrencyValue {
    pub amount: f64,
    pub currency: Currency,
}

impl CurrencyValue {
    pub fn new(amount: f64, currency: Currency) -> Self {
        CurrencyValue { amount, currency }
    }
}

#[derive(Debug, Clone)]
#[derive(serde::Serialize, serde::Deserialize)]
pub enum Currency {
    Usd,
}
