<?php
/**
 * Plugin Name: AILattice
 * Plugin URI:  https://ailattice.io
 * Description: Makes your site readable by ChatGPT, Perplexity and AI search. Generates /llms.txt, /ai/index.md, /ai/sitemap.md and adds Schema.org JSON-LD automatically.
 * Version:     1.0.0
 * Author:      Intelli-Stasis
 * Author URI:  https://intellistasis.com
 * License:     GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: ailattice
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'AIL_VERSION', '1.0.0' );
define( 'AIL_OPTION',  'ailattice_settings' );

// ── i18n ──────────────────────────────────────────────────────────────────────

add_action( 'init', function() {
    load_plugin_textdomain( 'ailattice', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
} );

// ── Activation / Deactivation ─────────────────────────────────────────────────

register_activation_hook( __FILE__, function() {
    ail_add_rewrite_rules();
    flush_rewrite_rules();
} );

register_deactivation_hook( __FILE__, function() {
    flush_rewrite_rules();
} );

// ── Settings helper ───────────────────────────────────────────────────────────

function ail_settings() {
    return wp_parse_args( get_option( AIL_OPTION, [] ), [
        'site_name'   => get_bloginfo( 'name' ),
        'description' => get_bloginfo( 'description' ),
        'cert_id'     => '',
    ] );
}

// ── Rewrite rules ─────────────────────────────────────────────────────────────

function ail_add_rewrite_rules() {
    add_rewrite_rule( '^llms\.txt$',      'index.php?ailattice_file=llms',       'top' );
    add_rewrite_rule( '^ai/index\.md$',   'index.php?ailattice_file=ai_index',   'top' );
    add_rewrite_rule( '^ai/sitemap\.md$', 'index.php?ailattice_file=ai_sitemap', 'top' );
    add_rewrite_rule( '^ai/?$',           'index.php?ailattice_file=ai_index',   'top' );
}

add_action( 'init', 'ail_add_rewrite_rules' );

add_filter( 'query_vars', function( $vars ) {
    $vars[] = 'ailattice_file';
    return $vars;
} );

// ── Serve AI files ────────────────────────────────────────────────────────────

add_action( 'template_redirect', function() {
    $file = get_query_var( 'ailattice_file' );
    if ( ! $file ) return;

    $s    = ail_settings();
    $url  = rtrim( home_url(), '/' );
    $name = $s['site_name']   ?: get_bloginfo( 'name' );
    $desc = $s['description'] ?: get_bloginfo( 'description' ) ?: 'A website.';
    $date = gmdate( 'Y-m-d' );

    header( 'Content-Type: text/plain; charset=utf-8' );
    header( 'Cache-Control: public, max-age=3600' );

    if ( $file === 'llms' ) {
        echo "# {$name} — llms.txt\n\n";
        echo "name: {$name}\n";
        echo "description: {$desc}\n";
        echo "url: {$url}\n";
        echo "ai-entry: {$url}/ai/index.md\n\n";
        echo "## AI Navigation\n";
        echo "Start at /ai/index.md for a full overview.\n";
        echo "See /ai/sitemap.md for all navigable pages.\n\n";
        echo "## What we do\n";
        echo "{$desc}\n";
        exit;
    }

    if ( $file === 'ai_index' ) {
        echo "---\n";
        echo "title: {$name} — AI Overview\n";
        echo "description: {$desc}\n";
        echo "last-updated: {$date}\n";
        echo "---\n\n";
        echo "# {$name}\n\n";
        echo "{$desc}\n\n";
        echo "## Pages\n";
        echo "- [Overview]({$url}/ai/index.md)\n";
        echo "- [Sitemap]({$url}/ai/sitemap.md)\n\n";
        echo "## Quick facts\n";
        echo "Visit {$url} for more information.\n";
        exit;
    }

    if ( $file === 'ai_sitemap' ) {
        $pages = get_pages( [
            'post_status' => 'publish',
            'number'      => 50,
            'sort_column' => 'menu_order',
            'sort_order'  => 'ASC',
        ] );
        $posts = get_posts( [
            'post_status' => 'publish',
            'numberposts' => 20,
            'orderby'     => 'date',
            'order'       => 'DESC',
        ] );

        echo "---\n";
        echo "title: {$name} — AI Sitemap\n";
        echo "description: All AI-navigable pages for {$name}\n";
        echo "last-updated: {$date}\n";
        echo "---\n\n";
        echo "# {$name} — AI Sitemap\n\n";
        echo "## Core AI pages\n";
        echo "- [Overview]({$url}/ai/index.md) — Site summary and entry point\n";
        echo "- [Sitemap]({$url}/ai/sitemap.md) — This file\n";

        if ( $pages ) {
            echo "\n## Pages\n";
            foreach ( $pages as $p ) {
                echo '- [' . esc_html( $p->post_title ) . '](' . get_permalink( $p->ID ) . ")\n";
            }
        }

        if ( $posts ) {
            echo "\n## Recent posts\n";
            foreach ( $posts as $p ) {
                echo '- [' . esc_html( $p->post_title ) . '](' . get_permalink( $p->ID ) . ")\n";
            }
        }

        exit;
    }
} );

// ── Inject <head> tags ────────────────────────────────────────────────────────

add_action( 'wp_head', function() {
    $s    = ail_settings();
    $url  = rtrim( home_url(), '/' );
    $name = $s['site_name']   ?: get_bloginfo( 'name' );
    $desc = $s['description'] ?: get_bloginfo( 'description' ) ?: '';

    echo "\n<!-- AILattice v" . AIL_VERSION . " -->\n";
    echo '<link rel="alternate" type="text/markdown" href="' . esc_url( $url . '/ai/' ) . '">' . "\n";

    $schema = [
        '@context' => 'https://schema.org',
        '@graph'   => [
            [
                '@type' => 'WebSite',
                '@id'   => $url . '/#website',
                'url'   => $url,
                'name'  => $name,
            ],
            [
                '@type'       => 'Organization',
                '@id'         => $url . '/#organization',
                'name'        => $name,
                'url'         => $url,
                'description' => $desc,
            ],
        ],
    ];

    echo '<script type="application/ld+json">' . "\n";
    echo wp_json_encode( $schema, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
    echo "\n</script>\n";
}, 1 );

// ── Admin menu ────────────────────────────────────────────────────────────────

add_action( 'admin_menu', function() {
    add_options_page(
        __( 'AILattice Settings', 'ailattice' ),
        __( 'AILattice', 'ailattice' ),
        'manage_options',
        'ailattice',
        'ail_render_settings_page'
    );
} );

add_action( 'admin_init', function() {
    register_setting( AIL_OPTION, AIL_OPTION, [
        'sanitize_callback' => function( $input ) {
            return [
                'site_name'   => sanitize_text_field( $input['site_name']   ?? '' ),
                'description' => sanitize_textarea_field( $input['description'] ?? '' ),
                'cert_id'     => sanitize_text_field( $input['cert_id']     ?? '' ),
            ];
        },
    ] );
} );

// ── Admin settings page ───────────────────────────────────────────────────────

function ail_render_settings_page() {
    $s     = ail_settings();
    $url   = home_url();
    $saved = isset( $_GET['settings-updated'] );

    $live_files = [
        [ '/llms.txt',      __( 'AI discovery file', 'ailattice' ) ],
        [ '/ai/index.md',   __( 'AI overview page',  'ailattice' ) ],
        [ '/ai/sitemap.md', __( 'AI page index',     'ailattice' ) ],
    ];
    ?>
    <div class="wrap" style="max-width:780px;">

        <h1 style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            &#127760; <?php esc_html_e( 'AILattice — AI-Ready Website', 'ailattice' ); ?>
        </h1>
        <p style="color:#6b7280;margin-bottom:24px;font-size:14px;">
            <?php esc_html_e( 'Your site is now AI-readable. The files below are live and auto-updating.', 'ailattice' ); ?>
            &nbsp;&middot;&nbsp;
            <a href="https://ailattice.io/validate?url=<?php echo urlencode( $url ); ?>" target="_blank">
                <?php esc_html_e( 'Validate my site', 'ailattice' ); ?> &#8594;
            </a>
        </p>

        <?php if ( $saved ) : ?>
            <div class="notice notice-success is-dismissible">
                <p><?php esc_html_e( 'Settings saved.', 'ailattice' ); ?></p>
            </div>
        <?php endif; ?>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:32px;">
            <?php foreach ( $live_files as [ $fpath, $flabel ] ) : ?>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:3px solid #16a34a;border-radius:8px;padding:16px;">
                <div style="font-size:10px;color:#16a34a;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">
                    <?php esc_html_e( 'LIVE', 'ailattice' ); ?>
                </div>
                <div style="font-family:monospace;font-size:12px;margin-bottom:4px;">
                    <a href="<?php echo esc_url( $url . $fpath ); ?>" target="_blank" style="color:#15803d;">
                        <?php echo esc_html( $fpath ); ?>
                    </a>
                </div>
                <div style="font-size:12px;color:#6b7280;"><?php echo esc_html( $flabel ); ?></div>
            </div>
            <?php endforeach; ?>
        </div>

        <form method="post" action="options.php">
            <?php settings_fields( AIL_OPTION ); ?>

            <table class="form-table" style="max-width:620px;">
                <tr>
                    <th scope="row">
                        <label for="ail_name"><?php esc_html_e( 'Site name', 'ailattice' ); ?></label>
                    </th>
                    <td>
                        <input type="text" id="ail_name"
                               name="<?php echo AIL_OPTION; ?>[site_name]"
                               value="<?php echo esc_attr( $s['site_name'] ); ?>"
                               class="regular-text"
                               placeholder="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>">
                        <p class="description">
                            <?php esc_html_e( 'Defaults to your WordPress site title.', 'ailattice' ); ?>
                        </p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="ail_desc"><?php esc_html_e( 'Description', 'ailattice' ); ?></label>
                    </th>
                    <td>
                        <textarea id="ail_desc"
                                  name="<?php echo AIL_OPTION; ?>[description]"
                                  rows="3" class="large-text"
                                  placeholder="<?php esc_attr_e( 'What your site does and who it serves', 'ailattice' ); ?>"><?php echo esc_textarea( $s['description'] ); ?></textarea>
                        <p class="description">
                            <?php esc_html_e( 'One or two sentences. Used in all AI files and Schema.org JSON-LD.', 'ailattice' ); ?>
                        </p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="ail_cert"><?php esc_html_e( 'Registry cert ID', 'ailattice' ); ?></label>
                        <div style="font-weight:400;color:#6b7280;font-size:12px;">
                            <?php esc_html_e( 'optional', 'ailattice' ); ?>
                        </div>
                    </th>
                    <td>
                        <input type="text" id="ail_cert"
                               name="<?php echo AIL_OPTION; ?>[cert_id]"
                               value="<?php echo esc_attr( $s['cert_id'] ); ?>"
                               class="regular-text"
                               placeholder="AIL-20260623-XXXX">
                        <p class="description">
                            <?php
                            printf(
                                /* translators: %s: link to ailattice.io/submit */
                                esc_html__( 'Get a free listing at %s.', 'ailattice' ),
                                '<a href="https://ailattice.io/submit" target="_blank">ailattice.io/submit</a>'
                            );
                            ?>
                        </p>
                    </td>
                </tr>
            </table>

            <?php submit_button( __( 'Save settings', 'ailattice' ) ); ?>
        </form>

        <hr style="margin:32px 0;">

        <h2 style="font-size:15px;font-weight:600;margin-bottom:8px;">
            <?php esc_html_e( 'Get listed in the AI Registry', 'ailattice' ); ?>
        </h2>
        <p style="color:#6b7280;font-size:14px;max-width:520px;margin-bottom:16px;">
            <?php esc_html_e( 'Your files are live. Submit to the free AILattice Registry so AI search engines and AI agents can discover your site.', 'ailattice' ); ?>
        </p>
        <a href="https://ailattice.io/submit?url=<?php echo urlencode( $url ); ?>"
           target="_blank"
           class="button button-primary"
           style="background:#16a34a;border-color:#15803d;text-shadow:none;">
            <?php esc_html_e( 'Submit to the registry — free', 'ailattice' ); ?> &#8594;
        </a>
        &nbsp;&nbsp;
        <a href="https://ailattice.io/validate?url=<?php echo urlencode( $url ); ?>"
           target="_blank"
           class="button">
            <?php esc_html_e( 'Validate my site', 'ailattice' ); ?> &#8594;
        </a>

    </div>
    <?php
}
