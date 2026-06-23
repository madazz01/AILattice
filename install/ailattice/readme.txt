=== AILattice ===
Contributors: intelli-stasis
Tags: ai, seo, chatgpt, schema, llms
Requires at least: 5.0
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Make your website visible to ChatGPT, Perplexity and AI search. Four files. One click. Free.

== Description ==

AI tools like ChatGPT, Perplexity and Google's AI Overviews now browse the web to answer questions. When someone asks about your business, your products, or your services — they're looking you up.

**The problem: most websites are invisible to AI.**

AI can scrape your HTML, but it has to guess at your structure, your purpose, and your content. It gets things wrong. It misses things. It recommends your competitors instead.

**AILattice fixes that in one click.**

Install this plugin and your site instantly gets a hidden AI layer — four plain text files that AI tools read directly. No guessing. No scraping. AI understands exactly what you do, who you serve, and how to navigate your site.

= What it does automatically =

* Generates `/llms.txt` — the AI discovery file: your name, description, and where to start
* Generates `/ai/index.md` — your site overview, written in the structure AI expects
* Generates `/ai/sitemap.md` — an AI-navigable index of all your pages and recent posts, kept up to date automatically
* Adds the AILattice `<link>` tag to your `<head>` so AI crawlers find your layer
* Adds Schema.org JSON-LD (WebSite + Organization types) to help Google AI Overviews cite you correctly

All files update automatically as you publish new pages and posts. Zero maintenance.

= Think of it like this =

* `robots.txt` tells bots what **not** to crawl
* `sitemap.xml` tells bots **what** to crawl
* `llms.txt` tells AI **what your site is**
* `/ai/` tells AI **how to navigate your content**

You already have the first two. This plugin adds the other two.

= Free AI registry listing =

After installing, submit your site to the [AILattice Registry](https://ailattice.io/registry) — a public catalog of AI-ready websites, indexed by topic and location. AI search engines and AI agents query it directly.

The registry is completely free. No payment, no gatekeeping. Any site that correctly implements the standard gets listed.

= Why this matters now =

AI search is moving faster than Google did. Sites that moved first on sitemaps, on HTTPS, on mobile — they compounded the advantage. The same thing is happening with AI readability right now. The sites that add this layer today will be the ones AI tools reference confidently tomorrow.

= The standard is open =

The AILattice standard is MIT licensed. It belongs to everyone. This plugin is the fastest way to implement it on WordPress — but developers can read the full spec and implement it manually at [ailattice.io](https://ailattice.io).

== Installation ==

**From your WordPress dashboard:**

1. Go to **Plugins → Add New → Upload Plugin**
2. Upload `ailattice.zip`
3. Click **Install Now**, then **Activate**
4. Go to **Settings → AILattice** — your files are already live
5. Visit [ailattice.io/validate](https://ailattice.io/validate) to confirm everything is working
6. Submit to the free registry at [ailattice.io/submit](https://ailattice.io/submit)

**Important:** The plugin requires WordPress pretty permalinks. Go to **Settings → Permalinks** and choose any structure other than Plain, then click Save.

== Frequently Asked Questions ==

= Does this cost anything? =

No. The plugin is free. The standard is MIT licensed and open. The registry listing is free. There is no paid tier, no premium version, no upsell.

= Will it slow down my site? =

No. The AI files are only served when an AI tool or crawler requests them, not on normal page loads. The Schema.org JSON-LD added to your `<head>` is a small inline snippet with no external requests.

= Will it change how my site looks? =

No. Everything this plugin does is completely invisible to human visitors. Your site looks and works exactly the same.

= I already have a physical llms.txt file. Will there be a conflict? =

If a physical `/llms.txt` file exists on your server, the server may serve it instead of the plugin's dynamic version. To use the plugin's version, remove the physical file.

= Do I need pretty permalinks? =

Yes. Go to **Settings → Permalinks** and select any structure other than Plain. Click Save to flush the rewrite rules.

= What is the AILattice Registry? =

A public catalog of AI-ready websites organised by topic and location. Open to any site that implements the AILattice standard correctly (score 70+ on the validator). AI search engines and AI agents can query it directly at [ailattice.io/search](https://ailattice.io/search). Organic ranking only — no paid placement, ever.

= How do I get listed in the registry? =

After installing and activating the plugin, go to [ailattice.io/submit](https://ailattice.io/submit), enter your URL, and submit. Your site will be scanned automatically. If it passes (score 70 or higher) you are listed instantly. Free.

= Does this replace my XML sitemap? =

No. Your XML sitemap (`sitemap.xml`) works alongside AILattice. They serve different audiences — XML sitemaps are for traditional search engine crawlers, AILattice files are for AI tools and agents.

= Is this compatible with Yoast SEO / Rank Math / other SEO plugins? =

Yes. AILattice adds its own Schema.org JSON-LD block. If you already have Schema.org output from another plugin, both will be present in your `<head>`. This is valid and supported by Google.

== Screenshots ==

1. The AILattice settings page — live file status and one-click registry submission
2. Your /llms.txt live in the browser, auto-generated from your site details
3. Your /ai/sitemap.md auto-populated with your published pages and posts

== Changelog ==

= 1.0.0 =
* Initial release

== Upgrade Notice ==

= 1.0.0 =
Initial release — install and activate. No configuration required.
