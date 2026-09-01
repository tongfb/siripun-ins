<?php
/**
 * Plugin Name: Siripun INS Lookup
 * Description: แสดง Siripun INS Lookup ผ่าน shortcode [siripun_ins] และมีหน้าหลังบ้านสำหรับตรวจอัปเดตฐานข้อมูล
 * Version: 0.2.0
 * Author: Siripun
 */

if (!defined('ABSPATH')) exit;

define('SIRIPUN_INS_VERSION', '0.2.0');
define('SIRIPUN_INS_DEFAULT_ASSET_BASE', 'https://siripun.com/ins-assets');

function siripun_ins_asset_base() {
    $value = get_option('siripun_ins_asset_base', SIRIPUN_INS_DEFAULT_ASSET_BASE);
    return untrailingslashit(esc_url_raw($value));
}

function siripun_ins_shortcode($atts = []) {
    static $instance = 0;
    $instance++;
    $base = siripun_ins_asset_base();

    wp_enqueue_style('siripun-ins-app', $base . '/app.css', [], SIRIPUN_INS_VERSION);

    $root_id = 'siripun-ins-root-' . $instance;
    $script_url = add_query_arg('v', SIRIPUN_INS_VERSION, $base . '/app.js');

    $loader = '<script>(function(){'
        . 'var root=document.getElementById(' . wp_json_encode($root_id) . ');'
        . 'if(!root){return;}'
        . 'var existing=document.querySelector("script[data-siripun-ins-runtime]");'
        . 'if(existing){'
        . 'if(window.__siripunInsMounted){return;}'
        . 'existing.addEventListener("load",function(){window.__siripunInsMounted=true;});'
        . 'return;'
        . '}'
        . 'var s=document.createElement("script");'
        . 's.src=' . wp_json_encode($script_url) . ';'
        . 's.async=false;'
        . 's.setAttribute("data-siripun-ins-runtime","1");'
        . 's.onload=function(){window.__siripunInsMounted=true;};'
        . 'document.head.appendChild(s);'
        . '})();</script>';

    return '<div id="' . esc_attr($root_id) . '" data-siripun-ins-root data-instance="' . esc_attr((string)$instance) . '"></div>' . $loader;
}
add_shortcode('siripun_ins', 'siripun_ins_shortcode');

function siripun_ins_admin_menu() {
    add_options_page('Siripun INS', 'Siripun INS', 'manage_options', 'siripun-ins', 'siripun_ins_admin_page');
}
add_action('admin_menu', 'siripun_ins_admin_menu');

function siripun_ins_register_settings() {
    register_setting('siripun_ins_settings', 'siripun_ins_asset_base', [
        'type' => 'string',
        'sanitize_callback' => 'esc_url_raw',
        'default' => SIRIPUN_INS_DEFAULT_ASSET_BASE,
    ]);
}
add_action('admin_init', 'siripun_ins_register_settings');

function siripun_ins_admin_notice_message() {
    $code = isset($_GET['siripun_ins_notice']) ? sanitize_key($_GET['siripun_ins_notice']) : '';
    if (!$code) return;
    $messages = [
        'check-started' => ['updated', 'เริ่มตรวจหาแหล่งข้อมูลที่มีการเปลี่ยนแปลงแล้ว'],
        'apply-started' => ['updated', 'เริ่มกระบวนการเตรียมอัปเดตฐานข้อมูลแล้ว'],
        'missing-secret' => ['error', 'ยังไม่ได้ตั้ง SIRIPUN_INS_UPDATE_SECRET ใน wp-config.php'],
        'trigger-failed' => ['error', 'ส่งคำสั่งไปยังระบบอัปเดตไม่สำเร็จ กรุณาตรวจ Cloudflare Worker และ secret'],
    ];
    if (!isset($messages[$code])) return;
    [$class, $text] = $messages[$code];
    echo '<div class="notice notice-' . esc_attr($class) . ' is-dismissible"><p>' . esc_html($text) . '</p></div>';
}
add_action('admin_notices', 'siripun_ins_admin_notice_message');

function siripun_ins_admin_page() {
    if (!current_user_can('manage_options')) return;
    $base = siripun_ins_asset_base();
    ?>
    <div class="wrap">
      <h1>Siripun INS Database</h1>
      <p>หน้าเว็บใช้ข้อมูลจาก GitHub/Cloudflare และ shortcode <code>[siripun_ins]</code></p>

      <form method="post" action="options.php">
        <?php settings_fields('siripun_ins_settings'); ?>
        <table class="form-table"><tr><th scope="row">Asset base URL</th><td>
          <input type="url" name="siripun_ins_asset_base" value="<?php echo esc_attr($base); ?>" class="regular-text" />
          <p class="description">ค่าปกติ: https://siripun.com/ins-assets</p>
        </td></tr></table>
        <?php submit_button('บันทึกการตั้งค่า'); ?>
      </form>

      <hr>
      <h2>อัปเดตฐานข้อมูล</h2>
      <p>ระบบจะสั่ง GitHub Actions ให้ตรวจต้นฉบับก่อน การอัปเดตข้อมูลต้องผ่านขั้นตรวจสอบเพื่อป้องกัน parser อ่านต้นฉบับผิดแล้วเผยแพร่ข้อมูลเสีย</p>
      <p>
        <a class="button button-primary" href="<?php echo esc_url(wp_nonce_url(admin_url('admin-post.php?action=siripun_ins_trigger_update&mode=check'), 'siripun_ins_update')); ?>">ตรวจหาข้อมูลใหม่</a>
        <a class="button" href="<?php echo esc_url(wp_nonce_url(admin_url('admin-post.php?action=siripun_ins_trigger_update&mode=apply'), 'siripun_ins_update')); ?>">เตรียมอัปเดตฐานข้อมูล</a>
      </p>
      <p class="description">GitHub token จะเก็บที่ Cloudflare Worker เท่านั้น ส่วน WordPress ใช้ shared trigger secret ที่กำหนดใน wp-config.php</p>
    </div>
    <?php
}

function siripun_ins_trigger_update() {
    if (!current_user_can('manage_options')) wp_die('Unauthorized');
    check_admin_referer('siripun_ins_update');
    if (!defined('SIRIPUN_INS_UPDATE_SECRET') || !SIRIPUN_INS_UPDATE_SECRET) {
        wp_safe_redirect(admin_url('options-general.php?page=siripun-ins&siripun_ins_notice=missing-secret'));
        exit;
    }
    $mode = isset($_GET['mode']) && $_GET['mode'] === 'apply' ? 'apply' : 'check';
    $endpoint = siripun_ins_asset_base() . '/api/update';
    $response = wp_remote_post($endpoint, [
        'timeout' => 15,
        'headers' => [
            'Authorization' => 'Bearer ' . SIRIPUN_INS_UPDATE_SECRET,
            'Content-Type' => 'application/json',
        ],
        'body' => wp_json_encode(['mode' => $mode]),
    ]);
    $ok = !is_wp_error($response) && in_array(wp_remote_retrieve_response_code($response), [200, 202], true);
    $notice = $ok ? ($mode === 'apply' ? 'apply-started' : 'check-started') : 'trigger-failed';
    wp_safe_redirect(admin_url('options-general.php?page=siripun-ins&siripun_ins_notice=' . $notice));
    exit;
}
add_action('admin_post_siripun_ins_trigger_update', 'siripun_ins_trigger_update');
