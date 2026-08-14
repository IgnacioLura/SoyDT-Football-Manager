# Multi-stage build: Rust engine-ffi cdylib (Linux .so) + .NET 9 API.
# Build context must be the FootballDT repo root (engine-ffi path-depends on
# ../../open-football/src/{core,database}), e.g.:
#   docker build -f soydt/Dockerfile -t soydt-api .

FROM rust:1-bookworm AS engine-build
WORKDIR /src
# `core`/`database`'s Cargo.toml inherit `edition`/`version` from
# `open-football`'s workspace root manifest, and that manifest's
# `[workspace] members` lists `src/web` too — so the whole `open-football`
# tree (minus `target/`, stripped by .dockerignore) has to come along, not
# just the two crates engine-ffi path-depends on.
COPY open-football open-football
COPY soydt/engine-ffi soydt/engine-ffi
WORKDIR /src/soydt/engine-ffi
# BuildKit cache mounts persist cargo's registry + this crate's target/ dir
# ACROSS separate `docker build` invocations (unlike a plain COPY-based
# layer, which starts target/ empty every time) — repeat builds after a
# small source edit only recompile the changed crate(s), not the whole
# dependency tree. Local iteration without Docker's build-layer overhead at
# all is still faster (see soydt/DEV_LOOP.md); this just makes `docker
# build` itself not pay full recompilation cost every time.
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/src/soydt/engine-ffi/target \
    cargo build --release && \
    cp target/release/libengine_ffi.so /tmp/libengine_ffi.so

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS api-build
WORKDIR /src
COPY soydt/SoyDT.sln .
COPY soydt/src src
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet restore SoyDT.sln
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet publish src/SoyDT.Api/SoyDT.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=api-build /app/publish .
# .NET's native library probing checks the app's base directory on every
# platform, so dropping the .so next to the managed assemblies is enough for
# `[LibraryImport("engine_ffi")]` to resolve it — no runtimes/<rid>/native
# layout needed for a single-RID container image.
COPY --from=engine-build /tmp/libengine_ffi.so .
EXPOSE 8080
ENTRYPOINT ["dotnet", "SoyDT.Api.dll"]
