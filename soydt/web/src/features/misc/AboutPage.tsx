import Layout from '../../shared/Layout'

// Ported from open-football/src/web/src/about/index.html. The original is
// server-rendered with i18n.t(...) lookups and a `{{ version }}` value from
// the Rust binary; the React app has no i18n system yet (see Layout.tsx —
// nav/lang toggle is still a static approximation), so copy is hardcoded
// English here, same as the rest of the ported pages. No backend endpoint
// needed — this is pure static content, unlike search/watchlist/workers
// which need real API support (Fase 3, per MIGRATION_CHECKLIST.md).

function AboutPage() {
  return (
    <Layout title="About">
      <div className="fm-page fm-ab-page">
        <article className="fm-ab-doc">
          <header className="fm-ab-hero">
            <h2 className="fm-ab-lede">A football management sim that runs entirely on your machine.</h2>
            <p className="fm-ab-standfirst">
              SoyDT is a from-scratch re-implementation of open-football: a Rust match engine behind a .NET API, with
              a React frontend.
            </p>
            <ul className="fm-ab-chips">
              <li className="fm-ab-chip fm-ab-chip-ver">
                <span className="fm-ab-chip-dot" aria-hidden="true" />
                SoyDT
              </li>
              <li className="fm-ab-chip">
                <i className="fa fa-cube" aria-hidden="true" />
                Native binary
              </li>
              <li className="fm-ab-chip">
                <i className="fa fa-plug-circle-xmark" aria-hidden="true" />
                Works offline
              </li>
              <li className="fm-ab-chip">
                <i className="fa fa-code-branch" aria-hidden="true" />
                Open source
              </li>
            </ul>
          </header>

          <section className="fm-ab-sec">
            <div className="fm-ab-sec-head">
              <i className="fa fa-futbol fm-ab-sec-ic" aria-hidden="true" />
              <h3>What is this?</h3>
            </div>
            <div className="fm-ab-split">
              <div className="fm-ab-prose">
                <p className="fm-ab-p-lead">
                  A single-player football management game: you follow leagues, teams and players through a
                  simulated world, season after season.
                </p>
                <p>
                  Behind the scenes a Rust engine simulates matches, transfers and player development for every club
                  in every league you load, while the frontend gives you a way to browse and follow it.
                </p>
                <p>There is no server to sign into and no online account — everything happens locally.</p>
                <div className="fm-ab-questions-block">
                  <div className="fm-ab-aside-title">Questions this app tries to answer</div>
                  <ul className="fm-ab-questions">
                    <li>How is my national team's league doing this season?</li>
                    <li>Which players are worth watching?</li>
                    <li>How did a transfer or a match actually play out?</li>
                    <li>What does a club's history and staff look like?</li>
                  </ul>
                </div>
              </div>
              <aside className="fm-ab-aside">
                <div className="fm-ab-aside-title">What's inside</div>
                <ul className="fm-ab-list">
                  <li>
                    <i className="fa fa-globe" aria-hidden="true" />
                    <span>A world of countries, leagues and clubs</span>
                  </li>
                  <li>
                    <i className="fa fa-bolt" aria-hidden="true" />
                    <span>A simulated match engine</span>
                  </li>
                  <li>
                    <i className="fa fa-seedling" aria-hidden="true" />
                    <span>Player growth and development</span>
                  </li>
                  <li>
                    <i className="fa fa-right-left" aria-hidden="true" />
                    <span>Transfers and the transfer market</span>
                  </li>
                  <li>
                    <i className="fa fa-mobile-screen" aria-hidden="true" />
                    <span>A responsive web UI</span>
                  </li>
                  <li>
                    <i className="fa fa-microchip" aria-hidden="true" />
                    <span>Runs on your own CPU, no cloud required</span>
                  </li>
                </ul>
              </aside>
            </div>
          </section>

          <section className="fm-ab-sec">
            <div className="fm-ab-sec-head">
              <i className="fa fa-flask fm-ab-sec-ic" aria-hidden="true" />
              <h3>Why rebuild it?</h3>
            </div>
            <div className="fm-ab-prose fm-ab-prose-wide">
              <p className="fm-ab-p-lead">
                SoyDT ports open-football's server-rendered pages to a React frontend backed by a .NET API, while
                reusing the original Rust simulation engine through FFI.
              </p>
              <p>
                The goal is the same simulation and the same look and feel, on an architecture that separates the
                engine, the API and the UI so each can evolve independently.
              </p>
            </div>
          </section>
        </article>
      </div>
    </Layout>
  )
}

export default AboutPage
