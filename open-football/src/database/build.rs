fn main() {
    // Rebuild when the embedded reference database changes. Unlike the old
    // gzip blob, this SQLite file is editable in place (any SQLite browser) —
    // no external compiler step required to produce it.
    println!("cargo:rerun-if-changed=src/data/database.sqlite");
}
