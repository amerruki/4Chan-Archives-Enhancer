// ==UserScript==
// @name         4chan Archives Enhancer
// @version      0.92
// @namespace    4chan-archives-enhancer
// @description  Enhancements for the main 4Chan Archive sites (archived.moe, thebarchive.com, archiveofsins.com)
// @license      MIT
// @match        https://archived.moe/*
// @match        https://thebarchive.com/*
// @match        https://archiveofsins.com/*
// @match        https://www.archived.moe/*
// @match        https://www.thebarchive.com/*
// @match        https://www.archiveofsins.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_download
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @connect      thebarchive.com
// @connect      archiveofsins.com
// @connect      archived.moe
// @connect      *
// @grant        window.onurlchange
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';
  console.log('[4AE] Script injected at', document.readyState);

  // ═══════════════════════════════════════════════════════════════════════
  //  SETTINGS & STORAGE
  // ═══════════════════════════════════════════════════════════════════════

  const SETTINGS_KEY = 'ffe_settings';
  const MD5_TRACK_KEY = 'ffe_tracked_md5s';
  const SAVED_THREADS_KEY = 'ffe_saved_threads';
  const VERSION = '0.9';

  const DEFAULTS = {
    imageExpansion: true, fitWidth: true, fitHeight: true,
    imageHoverZoom: false, advanceOnContract: false,

    galleryEnabled: true, galFitWidth: true, galFitHeight: true,
    galStretchToFit: false, galHideThumbnails: false, galScrollToPost: true, galSlideDelay: 6,
    quoteBacklinks: true, quoteThreading: true, threadQuotes: true,
    quotePreview: true, backlinkPosition: 'header', backlinkFormat: '>>%id', quoteHighlight: true,

    goonMode: true,
    md5Tracking: true,
    savedThreads: true,
    boardNavEnabled: true, customBoardNav: '',

    batchDownload: true, batchDownloadDelay: 300,
    keyboardNav: true, settingsKey: 'o', galleryKey: 'g', goonKey: 'f',
    md5FilterKey: 'm',

    textSize: 'default',
    indexThumbSize: 'default',
    threadThumbSize: 'default',
    headerPinned: true,
  };

  const SETTING_META = {
    imageExpansion:    { section: 'Images',  label: 'Image Expansion',       desc: 'Click thumbnails to expand inline' },
    fitWidth:          { section: 'Images',  label: 'Fit Width',             desc: 'Limit expanded images to page width' },
    fitHeight:         { section: 'Images',  label: 'Fit Height',            desc: 'Limit expanded images to viewport height' },
    imageHoverZoom:    { section: 'Images',  label: 'Image Hover Zoom',      desc: 'Show full image on hover' },
    advanceOnContract: { section: 'Images',  label: 'Advance on Contract',   desc: 'Scroll to next post when contracting' },

    galleryEnabled:    { section: 'Gallery', label: 'Gallery Mode',          desc: 'Fullscreen gallery with thumbnails' },
    galFitWidth:       { section: 'Gallery', label: 'Fit Width',             desc: 'Limit gallery image to viewport width' },
    galFitHeight:      { section: 'Gallery', label: 'Fit Height',            desc: 'Limit gallery image to viewport height' },
    galStretchToFit:   { section: 'Gallery', label: 'Stretch to Fit',        desc: 'Upscale small images to fill viewport' },
    galHideThumbnails: { section: 'Gallery', label: 'Hide Thumbnails',       desc: 'Hide the thumbnail sidebar' },
    galScrollToPost:   { section: 'Gallery', label: 'Scroll to Post',        desc: 'Scroll page to post when navigating' },
    galSlideDelay:     { section: 'Gallery', label: 'Slide Delay (seconds)', desc: 'Seconds between slides in slideshow', type: 'number' },

    quoteBacklinks:    { section: 'Quoting', label: 'Quote Backlinks',       desc: 'Show >>reply links on quoted posts' },
    quoteThreading:    { section: 'Quoting', label: 'Quote Threading',       desc: 'Nest replies under their parent post' },
    threadQuotes:      { section: 'Quoting', label: 'Thread Quotes Active',  desc: 'Threading on by default' },
    quotePreview:      { section: 'Quoting', label: 'Quote Preview',         desc: 'Hover preview for >>links' },
    backlinkPosition:  { section: 'Quoting', label: 'Backlink Position',     desc: '"header" or "bottom"', type: 'select', options: ['header', 'bottom'] },
    backlinkFormat:    { section: 'Quoting', label: 'Backlink Format',       desc: '%id = post number', type: 'text' },
    quoteHighlight:    { section: 'Quoting', label: 'Quote Highlighting',    desc: 'Highlight original post on hover' },

    goonMode:         { section: 'General', label: 'Goon Mode',             desc: 'Toggle to hide non-image posts' },
    md5Tracking:       { section: 'General', label: 'MD5 Tracking',          desc: 'Track and highlight posts by image MD5' },
    savedThreads:      { section: 'General', label: 'Saved Threads',         desc: 'Bookmark threads for quick access' },
    boardNavEnabled:   { section: 'General', label: 'Custom Board Nav',      desc: 'Custom board list at top of page' },
    customBoardNav:    { section: 'General', label: 'Board List',            desc: 'Comma-separated board codes (e.g. a,b,g,v,pol)', type: 'text-wide' },
    textSize:          { section: 'General', label: 'Text Size',             desc: 'Page text size', type: 'select', options: ['default', 'larger'] },
    indexThumbSize:    { section: 'General', label: 'Index Thumbnail Size',  desc: 'Thumbnail size on board index/gallery pages', type: 'select', options: ['default', 'medium', 'large', 'xlarge'] },
    threadThumbSize:   { section: 'General', label: 'Thread Thumbnail Size', desc: 'Thumbnail size in threads', type: 'select', options: ['default', 'large', 'xlarge'] },
    headerPinned:      { section: 'General', label: 'Header Bar Pinned',     desc: 'Keep header bar visible (unpin to auto-hide)', type: 'checkbox' },

    batchDownload:     { section: 'Downloads', label: 'Batch Download',      desc: '"Download Thread Media" button on thread pages' },
    batchDownloadDelay:{ section: 'Downloads', label: 'Batch Delay (ms)',    desc: 'Delay between downloads', type: 'number' },

    keyboardNav:       { section: 'General', label: 'Keyboard Shortcuts',    desc: 'Enable keyboard shortcuts' },
    settingsKey:       { section: 'General', label: 'Settings Key',          desc: 'Key to open settings', type: 'text' },
    galleryKey:        { section: 'General', label: 'Gallery Key',           desc: 'Key to open gallery', type: 'text' },
    goonKey:          { section: 'General', label: 'Goon Mode Key',          desc: 'Key to toggle Goon Mode', type: 'text' },
    md5FilterKey:        { section: 'General', label: 'MD5 Filter Key',        desc: 'Key to toggle MD5 Filter Mode', type: 'text' },
  };

  function loadSettings() {
    try { const r = GM_getValue(SETTINGS_KEY, '{}'); return { ...DEFAULTS, ...(typeof r === 'string' ? JSON.parse(r) : r) }; }
    catch { return { ...DEFAULTS }; }
  }
  function saveSettings(s) { GM_setValue(SETTINGS_KEY, JSON.stringify(s)); }
  let cfg = loadSettings();

  // MD5 storage
  function loadTrackedMD5s() {
    try { const r = GM_getValue(MD5_TRACK_KEY, '[]'); return new Set(typeof r === 'string' ? JSON.parse(r) : r); }
    catch { return new Set(); }
  }
  function saveTrackedMD5s() { GM_setValue(MD5_TRACK_KEY, JSON.stringify([...trackedMD5s])); }
  let trackedMD5s = loadTrackedMD5s();

  // Saved threads storage
  function loadSavedThreads() {
    try { const r = GM_getValue(SAVED_THREADS_KEY, '[]'); return typeof r === 'string' ? JSON.parse(r) : r; }
    catch { return []; }
  }
  function saveSavedThreads() { GM_setValue(SAVED_THREADS_KEY, JSON.stringify(savedThreadsList)); }
  let savedThreadsList = loadSavedThreads();

  // ═══════════════════════════════════════════════════════════════════════
  //  STYLES
  // ═══════════════════════════════════════════════════════════════════════

  GM_addStyle(`
    /* Text Size */
    :root.ffe-text-larger { font-size: 16px !important; }
    :root.ffe-text-larger .text, :root.ffe-text-larger .post_wrapper { font-size: 16px !important; }

    /* Image Expansion */
    .ffe-expanded { width: auto !important; height: auto !important; }
    :root.ffe-fit-width .ffe-expanded  { max-width: 100% !important; }
    :root.ffe-fit-height .ffe-expanded { max-height: calc(100vh - 25px) !important; }
    :root:not(.ffe-fit-width) .ffe-expanded  { max-width: none !important; }
    :root:not(.ffe-fit-height) .ffe-expanded { max-height: none !important; }
    .thread_image_link.ffe-expanding { cursor: wait; }

    /* Image Hover Zoom */
    .ffe-hover-zoom {
      position: fixed; z-index: 10001; max-width: 80vw; max-height: 80vh;
      pointer-events: none; box-shadow: 0 2px 12px rgba(0,0,0,0.5);
    }

    /* Quote Highlight */
    .ffe-highlight { outline: 2px solid rgba(100,150,255,0.5) !important; }

    /* Quote Preview — THEME-AWARE: no hardcoded colors */
    /* Hide FoolFuuka's native hover preview — we provide our own */
    .post_hover { display: none !important; }

    .ffe-quote-preview {
      position: absolute; z-index: 10000; max-width: 600px;
      pointer-events: none; font-size: 13px;
      box-shadow: 2px 2px 8px rgba(0,0,0,0.6);
    }
    .ffe-quote-preview > .post_wrapper { margin: 0 !important; }
    .ffe-quote-preview .post_image { max-width: 125px !important; max-height: 125px !important; }

    /* Backlinks */
    .ffe-backlinks { font-size: 0.85em; display: inline; }
    .ffe-backlinks::before { content: " "; }
    .ffe-backlinks .ffe-backlink { text-decoration: none; margin-right: 3px; }
    .ffe-backlinks .ffe-backlink:hover { color: red; }
    .ffe-backlinks-bottom { display: block; clear: both; margin: 4px 0 0; font-size: 0.85em; }
    .ffe-backlinks-bottom .ffe-backlink { text-decoration: none; margin-right: 4px; }
    .ffe-backlinks-bottom .ffe-backlink:hover { color: red; }

    /* Quote Threading */
    .ffe-thread-container { margin-left: 20px; border-left: 1px solid rgba(128,128,128,0.3); }
    .ffe-thread-container.ffe-collapsed { display: none; }
    .ffe-threadOP { clear: both; }
    .ffe-thread-toggle {
      cursor: pointer; font-family: monospace; font-size: 12px;
      margin-right: 4px; user-select: none; color: #89a;
      vertical-align: middle; display: inline-block; min-width: 16px; text-align: center;
    }
    .ffe-thread-toggle:hover { color: red; }
    .ffe-threading-toggle { cursor: pointer; font-size: 12px; margin-left: 8px; user-select: none; }
    .ffe-threading-toggle input { vertical-align: middle; margin-right: 2px; }

    /* Goon Mode */
    :root.ffe-goonMode article.post.ffe-noimage { display: none; }
    :root.ffe-goonMode .post_controls { display: none; }
    .ffe-goon-indicator {
      display: none; background: rgba(255,0,0,0.8); font-weight: bold;
      min-width: 9px; padding: 0 3px; margin: 0 4px; text-align: center;
      color: #fff; border-radius: 2px; cursor: pointer; font-size: 12px; line-height: 1.5;
    }
    :root.ffe-goonMode .ffe-goon-indicator { display: inline-block; }

    /* MD5 Filter Mode */
    :root.ffe-md5Filter article.post.ffe-md5-hidden { display: none; }
    .ffe-md5filter-indicator {
      display: none; background: rgba(0,120,255,0.8); font-weight: bold;
      min-width: 9px; padding: 0 3px; margin: 0 4px; text-align: center;
      color: #fff; border-radius: 2px; cursor: pointer; font-size: 12px; line-height: 1.5;
    }
    :root.ffe-md5Filter .ffe-md5filter-indicator { display: inline-block; }

    /* MD5 Tracking — highlight the whole visible post area */
    .ffe-md5-tracked { border-left: 3px solid #e74c3c !important; background: rgba(231,76,60,0.08) !important; }
    .ffe-md5-menu-btn { cursor: pointer; font-size: 10px; margin-left: 4px; opacity: 0.6; text-decoration: none; }
    .ffe-md5-menu-btn:hover { opacity: 1; }
    .ffe-md5-dropdown {
      position: fixed; z-index: 9999; min-width: 180px; font-size: 12px;
      background: #282a2e; border: 1px solid #555; box-shadow: 2px 2px 6px rgba(0,0,0,0.4);
    }
    .ffe-md5-dropdown a { display: block; padding: 5px 12px; cursor: pointer; text-decoration: none; color: #c5c8c6; }
    .ffe-md5-dropdown a:hover { background: #3a3d42; }

    /* View on Original Board link */
    .ffe-view-original {
      font-size: 11px; margin-left: 6px; color: #81a2be; text-decoration: none; opacity: 0.8;
      display: inline-flex; align-items: center; gap: 3px; vertical-align: middle;
    }
    .ffe-view-original:hover { opacity: 1; text-decoration: underline; }
    .ffe-view-original svg { width: 12px; height: 12px; }
    .ffe-view-original-corner {
      position: absolute; bottom: 4px; right: 6px;
      font-size: 10px; color: #81a2be; text-decoration: none; opacity: 0.5;
      display: inline-flex; align-items: center; gap: 2px;
    }
    .ffe-view-original-corner:hover { opacity: 1; text-decoration: underline; }
    .ffe-view-original-corner svg { width: 11px; height: 11px; }
    article.post .post_wrapper { position: relative; }

    /* ═══ UNIFIED TOP BAR (board nav LEFT + icons RIGHT) ═══ */
    .ffe-topbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 9998;
      display: flex; align-items: center; justify-content: space-between;
      height: 32px; padding: 0 10px;
      background: rgba(29,31,33,0.95); border-bottom: 1px solid #444;
      font-size: 12px; color: #c5c8c6;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    }
    .ffe-topbar.ffe-header-fading { opacity: 0.15; transition: opacity 0.3s; }
    .ffe-topbar.ffe-header-fading:hover { opacity: 1; }
    .ffe-topbar-left { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; overflow: hidden; }
    .ffe-topbar-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .ffe-topbar-right a {
      cursor: pointer; text-decoration: none; opacity: 0.7;
      display: inline-flex; align-items: center; color: #c5c8c6;
    }
    .ffe-topbar-right a:hover { opacity: 1; }
    .ffe-topbar-right svg { width: 20px; height: 20px; }
    body { padding-top: 34px !important; }
    html { scroll-padding-top: 38px; }

    /* Custom Board Nav (inside topbar-left) */
    .ffe-board-nav { font-size: 12px; display: flex; align-items: center; gap: 0; white-space: nowrap; }
    .ffe-board-nav a { text-decoration: none; color: #81a2be; }
    .ffe-board-nav a:hover { text-decoration: underline; color: #c5c8c6; }
    .ffe-board-nav a.ffe-board-current { font-weight: bold; color: #c5c8c6; }
    .ffe-board-nav-toggle { cursor: pointer; user-select: none; margin-right: 4px; font-family: monospace; color: #707880; }
    .ffe-board-nav-sep { margin: 0 3px; color: #555; }

    /* Saved Threads */
    .ffe-saved-dropdown {
      position: fixed; z-index: 100001; min-width: 320px; max-height: 400px; overflow-y: auto;
      background: #282a2e; border: 1px solid #555; box-shadow: 2px 2px 8px rgba(0,0,0,0.5);
      font-size: 12px; color: #c5c8c6;
    }
    .ffe-saved-dropdown .ffe-saved-item {
      display: flex; align-items: center; padding: 6px 10px; border-bottom: 1px solid #333;
    }
    .ffe-saved-dropdown .ffe-saved-item:hover { background: #3a3d42; }
    .ffe-saved-dropdown .ffe-saved-item a { flex: 1; color: #81a2be; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ffe-saved-dropdown .ffe-saved-item a:hover { text-decoration: underline; }
    .ffe-saved-dropdown .ffe-saved-item .ffe-saved-board { color: #b294bb; margin-right: 6px; min-width: 30px; }
    .ffe-saved-dropdown .ffe-saved-item .ffe-saved-remove { cursor: pointer; color: #888; margin-left: 8px; }
    .ffe-saved-dropdown .ffe-saved-item .ffe-saved-remove:hover { color: #e74c3c; }
    .ffe-saved-footer { padding: 6px 10px; text-align: center; border-top: 1px solid #444; }
    .ffe-saved-footer a { cursor: pointer; color: #888; text-decoration: underline; font-size: 11px; }
    .ffe-saved-footer a:hover { color: #e74c3c; }
    .ffe-saved-empty { padding: 16px; text-align: center; color: #666; font-style: italic; }

    /* ═══ FLOATING PANEL (bottom-right) ═══ */
    .ffe-float-panel {
      position: fixed; bottom: 12px; right: 12px; z-index: 9999;
      display: flex; align-items: center; gap: 6px;
      background: #282a2e; border: 1px solid #555; border-radius: 4px;
      padding: 6px 10px; font-family: arial, helvetica, sans-serif; font-size: 13px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }
    .ffe-float-panel button {
      background: #373b41; border: 1px solid #555; color: #c5c8c6;
      padding: 5px 8px; cursor: pointer; border-radius: 3px; font-size: 13px;
      display: inline-flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    .ffe-float-panel button:hover { background: #4a4e54; }
    .ffe-float-panel .ffe-float-dl {
      background: #282a2e; color: #c5c8c6; border-color: #555;
      padding: 5px 12px; gap: 6px; font-size: 12px;
    }
    .ffe-float-panel .ffe-float-dl:hover { background: #3a3d42; }
    .ffe-float-panel .ffe-float-hidden { display: none !important; }
    .ffe-float-panel svg { width: 14px; height: 14px; }

    /* ═══ INDEX PAGE CUSTOMIZATION ═══ */
    :root.ffe-index-thumb-medium .post_image,
    :root.ffe-index-thumb-medium .thread_image,
    :root.ffe-index-thumb-medium a.thread_image_link img {
      max-width: 250px !important; max-height: 250px !important;
    }
    :root.ffe-index-thumb-large .post_image,
    :root.ffe-index-thumb-large .thread_image,
    :root.ffe-index-thumb-large a.thread_image_link img {
      max-width: 400px !important; max-height: 400px !important;
    }
    :root.ffe-index-thumb-xlarge .post_image,
    :root.ffe-index-thumb-xlarge .thread_image,
    :root.ffe-index-thumb-xlarge a.thread_image_link img {
      max-width: none !important; max-height: none !important;
    }

    /* ═══ THREAD THUMBNAIL SIZES ═══ */
    /* FoolFuuka sets width/height attributes on <img>, so we must override them */
    /* Exclude .ffe-expanded so fit-width/fit-height still work on expanded images */
    :root.ffe-thread-thumb-large img.post_image:not(.ffe-expanded),
    :root.ffe-thread-thumb-large img.thread_image:not(.ffe-expanded) {
      width: auto !important; height: auto !important;
      max-width: none !important; max-height: none !important;
    }
    :root.ffe-thread-thumb-xlarge img.post_image:not(.ffe-expanded),
    :root.ffe-thread-thumb-xlarge img.thread_image:not(.ffe-expanded) {
      width: auto !important; height: auto !important;
      min-width: 300px !important; max-width: none !important; max-height: none !important;
    }

    /* Promoted threads on index */
    article.post.ffe-promoted { border-left: 3px solid #b294bb !important; }
    article.post.ffe-promoted-md5 { border-left: 3px solid #e74c3c !important; }

    /* ═══ GALLERY ═══ */
    #ffe-gallery {
      position: fixed; inset: 0; z-index: 99999; display: flex; flex-direction: row;
      background: rgba(0,0,0,0.85); font-family: arial, helvetica, sans-serif; color: #ddd; font-size: 13px;
    }
    .gal-viewport { display: flex; flex: 1 1 auto; flex-direction: row; align-items: stretch; overflow: hidden; position: relative; }
    .gal-image { flex: 1 0 auto; display: flex; align-items: flex-start; justify-content: space-around; overflow: hidden; width: 1%; }
    #ffe-gallery:not(.gal-fit-height) .gal-image { overflow-y: scroll !important; }
    #ffe-gallery:not(.gal-fit-width)  .gal-image { overflow-x: scroll !important; }
    .gal-image img, .gal-image video { display: block; margin: auto; transition: transform 0.15s ease; }
    #ffe-gallery.gal-fit-width .gal-image img, #ffe-gallery.gal-fit-width .gal-image video { max-width: 100%; }
    #ffe-gallery.gal-fit-height .gal-image img, #ffe-gallery.gal-fit-height .gal-image video { max-height: calc(100vh - 25px); }
    #ffe-gallery.gal-stretch .gal-image img { min-width: 100%; min-height: calc(100vh - 25px); object-fit: contain; }
    .gal-prev, .gal-next { flex: 0 0 28px; position: relative; cursor: pointer; opacity: 0.5; background: rgba(0,0,0,0.3); transition: opacity 0.15s; }
    .gal-prev:hover, .gal-next:hover { opacity: 1; }
    .gal-prev::after, .gal-next::after { position: absolute; top: 50%; transform: translateY(-50%); content: ""; display: block; border-top: 12px solid transparent; border-bottom: 12px solid transparent; }
    .gal-prev::after { border-right: 14px solid #fff; right: 7px; }
    .gal-next::after { border-left: 14px solid #fff; left: 7px; }
    .gal-topbar { position: absolute; top: 0; left: 28px; right: 28px; display: flex; justify-content: space-between; align-items: center; padding: 4px 10px; background: rgba(0,0,0,0.6); z-index: 1; min-height: 22px; }
    .gal-labels { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
    .gal-count { white-space: nowrap; }
    .gal-name { color: #9bf; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .gal-name:hover { text-decoration: underline; }
    .gal-buttons { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .gal-buttons a { cursor: pointer; color: #ddd; text-decoration: none; padding: 2px 5px; font-size: 14px; }
    .gal-buttons a:hover { color: #fff; }
    .gal-start i { display: inline-block; width: 0; height: 0; border-left: 8px solid #ddd; border-top: 5px solid transparent; border-bottom: 5px solid transparent; vertical-align: middle; }
    .gal-stop i { display: inline-block; width: 8px; height: 8px; border: 0; background: #ddd; vertical-align: middle; }
    .gal-buttons.gal-playing .gal-start { display: none; }
    .gal-buttons:not(.gal-playing) .gal-stop { display: none; }
    .gal-close { font-size: 20px !important; }
    .gal-menu { position: absolute; top: 28px; right: 28px; background: rgba(30,30,30,0.95); border: 1px solid #555; padding: 8px 12px; z-index: 2; min-width: 160px; display: none; }
    .gal-menu.gal-menu-open { display: block; }
    .gal-menu label { display: block; padding: 3px 0; cursor: pointer; font-size: 12px; color: #ccc; white-space: nowrap; }
    .gal-menu label:hover { color: #fff; }
    .gal-menu input[type="checkbox"] { vertical-align: middle; margin-right: 5px; }
    .gal-menu label.gal-delay-label { margin-top: 6px; }
    .gal-menu input[type="number"] { width: 50px; background: #333; color: #ddd; border: 1px solid #555; padding: 1px 3px; font-size: 12px; }
    .gal-thumbnails { flex: 0 0 150px; overflow-y: auto; display: flex; flex-direction: column; align-items: stretch; text-align: center; background: rgba(0,0,0,0.5); border-left: 1px solid #333; }
    #ffe-gallery.gal-hide-thumbnails .gal-thumbnails { display: none; }
    .gal-thumbnails a { display: block; padding: 4px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.1s; }
    .gal-thumbnails a:hover { background: rgba(255,255,255,0.1); }
    .gal-thumbnails a.gal-thumb-active { background: rgba(100,150,255,0.25); outline: 2px solid #69f; }
    .gal-thumbnails img { max-width: 100%; max-height: 120px; object-fit: contain; display: block; margin: auto; }
    .gal-dl-btn {
      position: absolute; bottom: 12px; right: 12px; z-index: 2;
      display: inline-flex; align-items: center; gap: 6px;
      background: #282a2e; color: #c5c8c6; border: 1px solid #555; border-radius: 4px;
      padding: 5px 12px; font-size: 12px; cursor: pointer; font-family: inherit;
    }
    .gal-dl-btn:hover { background: #3a3d42; }
    .gal-dl-btn svg { width: 14px; height: 14px; }

    /* ═══ SETTINGS PANEL ═══ */
    #ffe-overlay { position: fixed; inset: 0; z-index: 100000; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
    #ffe-settings {
      box-sizing: border-box; width: 750px; max-width: 95vw; height: 550px; max-height: 90vh;
      background: #282a2e; border: 1px solid #555; box-shadow: 0 0 15px rgba(0,0,0,0.4);
      display: flex; flex-direction: column; font-family: arial, helvetica, sans-serif; font-size: 13px; color: #c5c8c6;
    }
    #ffe-settings nav { padding: 6px 10px; display: flex; align-items: center; border-bottom: 1px solid #555; background: #1d1f21; flex-shrink: 0; }
    #ffe-settings nav .ffe-tabs { flex: 1; display: flex; gap: 4px; flex-wrap: wrap; }
    #ffe-settings nav .ffe-tab { padding: 4px 10px; cursor: pointer; border: 1px solid transparent; border-radius: 3px 3px 0 0; font-size: 13px; color: #81a2be; text-decoration: underline; background: transparent; }
    #ffe-settings nav .ffe-tab:hover { background: #282a2e; }
    #ffe-settings nav .ffe-tab.ffe-tab-selected { font-weight: 700; text-decoration: none; background: #282a2e; border-color: #555; border-bottom-color: #282a2e; color: #c5c8c6; }
    #ffe-settings .ffe-close-btn { cursor: pointer; font-size: 18px; color: #c5c8c6; padding: 0 4px; line-height: 1; text-decoration: none; margin-left: 8px; }
    #ffe-settings .ffe-close-btn:hover { color: #e74c3c; }
    #ffe-settings .ffe-section-container { flex: 1; overflow: auto; padding: 10px 14px; overscroll-behavior: contain; }
    #ffe-settings .ffe-section { display: none; }
    #ffe-settings .ffe-section.ffe-section-active { display: block; }
    #ffe-settings .ffe-option { padding: 4px 0; display: flex; align-items: baseline; gap: 6px; }
    #ffe-settings .ffe-option label { cursor: pointer; white-space: nowrap; font-weight: 600; color: #c5c8c6; }
    #ffe-settings .ffe-option .ffe-desc { color: #888; font-size: 12px; }
    #ffe-settings .ffe-option input[type="checkbox"] { margin-right: 4px; vertical-align: middle; }
    #ffe-settings .ffe-option input[type="text"],
    #ffe-settings .ffe-option input[type="number"],
    #ffe-settings .ffe-option select { border: 1px solid #555; background: #1d1f21; padding: 2px 4px; font-size: 12px; color: #c5c8c6; width: 80px; }
    #ffe-settings .ffe-option input.ffe-text-wide { width: 300px; }
    #ffe-settings .ffe-footer { padding: 6px 10px; border-top: 1px solid #555; background: #1d1f21; font-size: 12px; display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    #ffe-settings .ffe-footer a { cursor: pointer; text-decoration: underline; color: #81a2be; }
    #ffe-settings .ffe-footer a:hover { color: #e74c3c; }
    #ffe-settings .ffe-footer .ffe-spacer { flex: 1; }
    #ffe-settings .ffe-footer .ffe-status { color: #b5bd68; font-style: italic; }
    #ffe-settings .ffe-footer input[type="file"] { display: none; }

    /* MD5 Manager Tab */
    .ffe-md5-manager { padding: 4px 0; }
    .ffe-md5-manager .ffe-md5-list { max-height: 280px; overflow-y: auto; border: 1px solid #555; background: #1d1f21; margin: 6px 0; }
    .ffe-md5-manager .ffe-md5-entry { display: flex; align-items: center; padding: 3px 8px; border-bottom: 1px solid #333; font-family: monospace; font-size: 11px; }
    .ffe-md5-manager .ffe-md5-entry:hover { background: #3a3d42; }
    .ffe-md5-manager .ffe-md5-entry span { flex: 1; overflow: hidden; text-overflow: ellipsis; }
    .ffe-md5-manager .ffe-md5-entry a { cursor: pointer; color: #888; margin-left: 8px; text-decoration: none; }
    .ffe-md5-manager .ffe-md5-entry a:hover { color: #e74c3c; }
    .ffe-md5-manager .ffe-md5-add { display: flex; gap: 4px; margin-top: 6px; }
    .ffe-md5-manager .ffe-md5-add input { flex: 1; background: #1d1f21; border: 1px solid #555; color: #c5c8c6; padding: 3px 6px; font-size: 12px; font-family: monospace; }
    .ffe-md5-manager .ffe-md5-add button { background: #373b41; border: 1px solid #555; color: #c5c8c6; padding: 3px 10px; cursor: pointer; font-size: 12px; }
    .ffe-md5-manager .ffe-md5-add button:hover { background: #4a4e54; }
    .ffe-md5-manager .ffe-md5-actions { margin-top: 6px; display: flex; gap: 8px; align-items: center; }
    .ffe-md5-manager .ffe-md5-actions a { cursor: pointer; color: #81a2be; text-decoration: underline; font-size: 12px; }
  `);

  // ═══════════════════════════════════════════════════════════════════════
  //  SVG ICONS
  // ═══════════════════════════════════════════════════════════════════════

  function svgIcon(pathD, titleText, size) {
    const s = size || 16;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', s);
    svg.setAttribute('height', s);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.style.verticalAlign = 'middle';
    if (Array.isArray(pathD)) {
      pathD.forEach(d => {
        if (typeof d === 'string') {
          const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          p.setAttribute('d', d);
          svg.appendChild(p);
        } else {
          const el = document.createElementNS('http://www.w3.org/2000/svg', d.tag);
          for (const [k, v] of Object.entries(d.attrs)) el.setAttribute(k, v);
          svg.appendChild(el);
        }
      });
    } else {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', pathD);
      svg.appendChild(p);
    }
    if (titleText) {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      t.textContent = titleText;
      svg.appendChild(t);
    }
    return svg;
  }

  const icons = {
    cog: (t) => svgIcon([
      {tag:'circle', attrs:{cx:'12',cy:'12',r:'3'}},
      'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'
    ], t || "Archive Enhancer Settings"),
    download: (t) => svgIcon([
      'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
      {tag:'polyline', attrs:{points:'7 10 12 15 17 10'}},
      {tag:'line', attrs:{x1:'12',y1:'15',x2:'12',y2:'3'}}
    ], t || 'Download'),
    bookmark: (t) => svgIcon('M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z', t || 'Saved Threads'),
    // Heart icons for save/unsave (clearer than pin)
    heartFilled: (t) => {
      const s = svgIcon('M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z', t || 'Unsave Thread');
      s.setAttribute('fill', 'currentColor');
      return s;
    },
    heartOutline: (t) => svgIcon('M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z', t || 'Save Thread'),
    arrowUp: (t) => svgIcon([
      {tag:'polyline', attrs:{points:'18 15 12 9 6 15'}}
    ], t || 'Go to top'),
    arrowDown: (t) => svgIcon([
      {tag:'polyline', attrs:{points:'6 9 12 15 18 9'}}
    ], t || 'Go to bottom'),
    externalLink: (t) => svgIcon([
      'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
      {tag:'polyline', attrs:{points:'15 3 21 3 21 9'}},
      {tag:'line', attrs:{x1:'10',y1:'14',x2:'21',y2:'3'}}
    ], t || 'View on original board'),
    skipPrev: (t) => svgIcon([
      {tag:'polygon', attrs:{points:'19 20 9 12 19 4 19 20'}},
      {tag:'line', attrs:{x1:'5',y1:'19',x2:'5',y2:'5'}}
    ], t || 'Previous tracked MD5 post'),
    skipNext: (t) => svgIcon([
      {tag:'polygon', attrs:{points:'5 4 15 12 5 20 5 4'}},
      {tag:'line', attrs:{x1:'19',y1:'5',x2:'19',y2:'19'}}
    ], t || 'Next tracked MD5 post'),
    lock: (t) => svgIcon([
      {tag:'rect', attrs:{x:'3',y:'11',width:'18',height:'11',rx:'2',ry:'2'}},
      'M7 11V7a5 5 0 0 1 10 0v4'
    ], t || 'Header pinned'),
    unlock: (t) => svgIcon([
      {tag:'rect', attrs:{x:'3',y:'11',width:'18',height:'11',rx:'2',ry:'2'}},
      'M7 11V7a5 5 0 0 1 9.9-1'
    ], t || 'Header unpinned'),
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  UTILITY
  // ═══════════════════════════════════════════════════════════════════════

  const doc = document.documentElement;
  const isThreadPage = /\/thread\/\d+/.test(location.pathname);
  const isBoardIndex = /^\/[^/]+\/(page\/\d+\/?)?$/.test(location.pathname);
  const isGalleryOrSearch = !isThreadPage && !isBoardIndex; // gallery, search, etc.
  const isIndexPage = !isThreadPage;
  const currentBoard = (location.pathname.match(/^\/([^/]+)/) || [])[1] || '';
  const currentHost = location.hostname.replace(/^www\./, '');

  // Cross-archive routing
  const BOARD_HOSTS = {
    b: 'thebarchive.com',
    s: 'archiveofsins.com', hc: 'archiveofsins.com', h: 'archiveofsins.com',
    hm: 'archiveofsins.com', i: 'archiveofsins.com', lgbt: 'archiveofsins.com',
    r: 'archiveofsins.com', soc: 'archiveofsins.com', t: 'archiveofsins.com', u: 'archiveofsins.com',
  };
  const CROSS_HOSTED_BOARDS = Object.keys(BOARD_HOSTS);
  const isBlockedExpansion = currentHost === 'archived.moe' && CROSS_HOSTED_BOARDS.includes(currentBoard);

  function getBoardUrl(board) {
    const host = BOARD_HOSTS[board] || 'archived.moe';
    return host === currentHost ? `/${board}/` : `https://${host}/${board}/`;
  }

  function getPostNum(article) {
    if (!article) return null;
    const el = article.closest ? (article.closest('article.thread, article.post') || article) : article;
    const id = el.id || '';
    const parts = id.split('_');
    const num = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    return num && /^\d+$/.test(num) ? num : (el.dataset?.num || el.dataset?.docId || null);
  }

  const _postCache = {};
  let _postCacheBuilt = false;
  function buildPostCache() {
    if (_postCacheBuilt) return;
    document.querySelectorAll('article.thread, article.post').forEach(a => { const n = getPostNum(a); if (n) _postCache[n] = a; });
    _postCacheBuilt = true;
  }
  function findPostArticle(pn) {
    buildPostCache();
    const s = String(pn);
    return _postCache[s] || document.getElementById(pn) || document.getElementById(`p${pn}`) || document.querySelector(`article[id$="_${pn}"]`);
  }
  function cachePost(a) { const n = getPostNum(a); if (n) _postCache[n] = a; }

  function getQuoteTarget(link) {
    const dp = link.dataset?.post;
    if (dp) { const p = dp.split(','); const n = p[p.length-1].trim(); if (/^\d+$/.test(n)) return n; }
    const db = link.dataset?.backlink;
    if (db && /^\d+$/.test(db)) return db;
    const href = link.getAttribute('href') || '';
    let m = href.match(/#p?(\d+)/); if (m) return m[1];
    m = href.match(/\/post\/(\d+)/); if (m) return m[1];
    m = link.textContent?.match(/>>(\d+)/); if (m) return m[1];
    return null;
  }

  function getPostQuoteLinks(article) {
    const t = article.querySelector('.text');
    return t ? Array.from(t.querySelectorAll('a.backlink, a[data-backlink], a[data-post]')) : [];
  }

  function getPostMD5(article) {
    // 1) Try View Same link
    const l = getPostSameLink(article);
    if (l) { const m = l.href.match(/\/search\/image\/([^/]+)/); if (m) return m[1]; }
    // 2) Fallback: data-md5 on the image (works even when View Same is absent)
    const img = article.querySelector('img[data-md5]');
    if (img?.dataset?.md5) return img.dataset.md5;
    return null;
  }

  function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  // OP is article.thread (rendered by board.php), replies are article.post (rendered by board_comment.php)
  function getAllPosts() { return Array.from(document.querySelectorAll('article.thread, article.post')); }

  function getAllMediaEntries() {
    const entries = [];
    // article.thread = OP (image in .thread_image_box child), article.post = replies
    document.querySelectorAll('article.thread, article.post').forEach(article => {
      const link = article.querySelector('.thread_image_link');
      if (!link?.href) return;
      const thumb = article.querySelector('.post_image, .thread_image');
      const filenameEl = article.querySelector('.post_file_filename');
      entries.push({
        url: link.href,
        thumbSrc: thumb?.src || '',
        filename: filenameEl?.title || filenameEl?.textContent?.trim() || link.href.split('/').pop(),
        postNum: getPostNum(article),
        article
      });
    });
    return entries;
  }

  function applyFitClasses() {
    doc.classList.toggle('ffe-fit-width', cfg.fitWidth);
    doc.classList.toggle('ffe-fit-height', cfg.fitHeight);
  }

  function applyTextSize() {
    doc.classList.toggle('ffe-text-larger', cfg.textSize === 'larger');
  }

  function copyToClipboard(text) {
    if (typeof GM_setClipboard === 'function') { GM_setClipboard(text, 'text'); return true; }
    if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text); return true; }
    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  HOTLINK PROXY — GM_xmlhttpRequest for cross-origin images
  // ═══════════════════════════════════════════════════════════════════════

  function proxyLoadImage(url, onSuccess, onError) {
    try {
      const urlHost = new URL(url).hostname.replace(/^www\./, '');
      if (urlHost === currentHost) {
        onSuccess(url);
        return;
      }
    } catch { onSuccess(url); return; }

    if (typeof GM_xmlhttpRequest === 'function') {
      GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        responseType: 'blob',
        anonymous: true,
        onload: (resp) => {
          if (resp.status >= 200 && resp.status < 400 && resp.response) {
            const blobUrl = URL.createObjectURL(resp.response);
            onSuccess(blobUrl, true);
          } else {
            (onError || onSuccess)(url);
          }
        },
        onerror: () => (onError || onSuccess)(url)
      });
    } else {
      onSuccess(url);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  1. IMAGE EXPANSION
  // ═══════════════════════════════════════════════════════════════════════

  function initImageExpansion() {
    if (!cfg.imageExpansion) return;
    applyFitClasses();

    document.addEventListener('click', (e) => {
      const link = e.target.closest('.thread_image_link');
      if (!link) return;

      // Gallery/search pages: open thread in new tab (not expand)
      // Board index pages: expand inline (fall through to expansion logic below)
      if (isGalleryOrSearch) {
        const article = link.closest('article.thread, article.post');
        if (!article) return;
        const threadLink = article.querySelector('a[href*="/thread/"]');
        const threadNum = article.dataset?.threadNum || getPostNum(article);
        let url;
        if (threadLink) {
          url = threadLink.href;
          const board = (url.match(/\/([^/]+)\/thread\//) || [])[1] || currentBoard;
          const host = BOARD_HOSTS[board];
          if (host && host !== currentHost) url = url.replace(/^https?:\/\/[^/]+/, `https://${host}`);
        } else if (threadNum) {
          url = getBoardUrl(currentBoard) + `thread/${threadNum}/`;
        }
        if (url) {
          // Rewrite href+target and let the native <a> click open the new tab
          link.href = url; link.target = '_blank'; link.rel = 'noopener';
          return; // don't preventDefault — browser follows the rewritten link naturally
        }
        return;
      }

      const href = link.href || '';
      if (/\.(webm|mp4)$/i.test(href)) return;

      // On blocked boards (archived.moe + /b/,/s/,/hc/), completely skip — no expansion
      if (isBlockedExpansion) return;

      e.preventDefault();
      e.stopPropagation();

      const img = link.querySelector('.post_image, .thread_image');
      if (!img) return;

      if (img.classList.contains('ffe-expanded')) {
        if (img.dataset.ffeBlobUrl) { URL.revokeObjectURL(img.dataset.ffeBlobUrl); delete img.dataset.ffeBlobUrl; }
        img.src = img.dataset.ffeThumb;
        img.classList.remove('ffe-expanded');
        if (cfg.advanceOnContract) {
          const post = link.closest('article.thread, article.post');
          let next = post?.nextElementSibling;
          while (next && !next.matches('article.thread, article.post')) next = next.nextElementSibling;
          if (next) next.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }

      if (!img.dataset.ffeThumb) img.dataset.ffeThumb = img.src;
      link.classList.add('ffe-expanding');

      proxyLoadImage(href, (loadUrl, isBlob) => {
        img.src = loadUrl;
        if (isBlob) img.dataset.ffeBlobUrl = loadUrl;
        img.classList.add('ffe-expanded');
        link.classList.remove('ffe-expanding');
      }, () => {
        link.classList.remove('ffe-expanding');
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  2. IMAGE HOVER ZOOM
  // ═══════════════════════════════════════════════════════════════════════

  function initImageHoverZoom() {
    if (!cfg.imageHoverZoom) return;
    let hoverImg = null;
    document.addEventListener('mouseover', (e) => {
      const link = e.target.closest('.thread_image_link');
      if (!link || /\.(webm|mp4)$/i.test(link.href || '')) return;
      if (isBlockedExpansion) return; // No hover zoom on blocked boards either
      hoverImg = document.createElement('img');
      hoverImg.className = 'ffe-hover-zoom';
      document.body.appendChild(hoverImg);
      proxyLoadImage(link.href, (url, isBlob) => { if (hoverImg) { hoverImg.src = url; if (isBlob) hoverImg.dataset.ffeBlobUrl = url; } });
    });
    document.addEventListener('mousemove', (e) => {
      if (!hoverImg) return;
      hoverImg.style.left = Math.min(e.clientX + 20, window.innerWidth - hoverImg.offsetWidth - 10) + 'px';
      hoverImg.style.top = Math.min(e.clientY + 10, window.innerHeight - hoverImg.offsetHeight - 10) + 'px';
    });
    document.addEventListener('mouseout', (e) => {
      if (!e.target.closest('.thread_image_link')) return;
      if (hoverImg) { if (hoverImg.dataset.ffeBlobUrl) URL.revokeObjectURL(hoverImg.dataset.ffeBlobUrl); hoverImg.remove(); hoverImg = null; }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  3. QUOTE PREVIEW (theme-aware)
  // ═══════════════════════════════════════════════════════════════════════

  function initQuotePreview() {
    if (!cfg.quotePreview) return;
    let previewEl = null, activeLink = null;

    function isQL(el) { return el.matches('a.backlink, a[data-backlink], a[data-post], .ffe-backlink'); }

    function show(link, pn) {
      hide();
      const post = findPostArticle(pn);
      if (!post) return;
      activeLink = link;

      previewEl = document.createElement('div');
      previewEl.className = 'ffe-quote-preview';
      const wrapper = post.querySelector('.post_wrapper');
      if (wrapper) {
        const clone = wrapper.cloneNode(true);
        previewEl.appendChild(clone);
      } else {
        previewEl.innerHTML = post.innerHTML;
      }
      document.body.appendChild(previewEl);

      const rect = link.getBoundingClientRect();
      let top = rect.bottom + window.scrollY + 4;
      let left = rect.left + window.scrollX;
      if (left + previewEl.offsetWidth > window.innerWidth + window.scrollX - 10) left = window.innerWidth + window.scrollX - previewEl.offsetWidth - 10;
      if (top + previewEl.offsetHeight > window.innerHeight + window.scrollY) top = rect.top + window.scrollY - previewEl.offsetHeight - 4;
      previewEl.style.left = left + 'px';
      previewEl.style.top = top + 'px';

      if (cfg.quoteHighlight) post.classList.add('ffe-highlight');
    }

    function hide() {
      if (previewEl) { previewEl.remove(); previewEl = null; }
      if (activeLink) { document.querySelectorAll('.ffe-highlight').forEach(el => el.classList.remove('ffe-highlight')); activeLink = null; }
    }

    document.addEventListener('mouseover', (e) => {
      const l = e.target.closest('a');
      if (l && isQL(l)) { const pn = getQuoteTarget(l); if (pn) show(l, pn); }
    });
    document.addEventListener('mouseout', (e) => {
      const l = e.target.closest('a');
      if (l && isQL(l)) hide();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  4. BACKLINKS
  // ═══════════════════════════════════════════════════════════════════════

  function initBacklinks() {
    if (!cfg.quoteBacklinks) return;
    const bm = new Map();
    getAllPosts().forEach(a => {
      const qn = getPostNum(a); if (!qn) return;
      getPostQuoteLinks(a).forEach(l => {
        const tn = getQuoteTarget(l);
        if (tn && tn !== qn) { if (!bm.has(tn)) bm.set(tn, new Set()); bm.get(tn).add(qn); }
      });
    });
    for (const [tn, qns] of bm) {
      const tp = findPostArticle(tn);
      if (!tp || tp.querySelector('.ffe-backlinks, .ffe-backlinks-bottom')) continue;
      const c = document.createElement('span');
      c.className = cfg.backlinkPosition === 'bottom' ? 'ffe-backlinks-bottom' : 'ffe-backlinks';
      for (const qn of qns) {
        const a = document.createElement('a');
        a.className = 'ffe-backlink'; a.href = '#' + (findPostArticle(qn)?.id || qn);
        a.dataset.post = qn; a.textContent = cfg.backlinkFormat.replace('%id', qn);
        c.appendChild(a); c.appendChild(document.createTextNode(' '));
      }
      if (cfg.backlinkPosition === 'bottom') {
        const t = tp.querySelector('.text'); if (t) t.after(c); else tp.querySelector('.post_wrapper')?.appendChild(c);
      } else {
        (tp.querySelector('.post_data') || tp.querySelector('header'))?.appendChild(c);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  5. THREADING + FOLDING
  // ═══════════════════════════════════════════════════════════════════════

  const Threading = {
    parentOf: {}, childrenOf: {}, origPositions: [], threaded: false,

    init() {
      if (!cfg.quoteThreading || !isThreadPage) return;
      const posts = getAllPosts();
      if (posts.length < 2) return;
      this.origPositions = posts.map(el => ({ el, parent: el.parentNode, nextSib: el.nextSibling }));

      const nums = [], nta = {};
      posts.forEach(a => { const n = getPostNum(a); if (n) { nums.push(n); nta[n] = a; } });
      const ni = {}; nums.forEach((n, i) => ni[n] = i);

      posts.forEach(a => {
        const my = getPostNum(a); if (!my) return;
        const myI = ni[my];
        let best = null, bestI = -1;
        getPostQuoteLinks(a).forEach(l => {
          const tn = getQuoteTarget(l);
          if (tn && tn !== my && nta[tn] && ni[tn] < myI && ni[tn] > bestI) { bestI = ni[tn]; best = tn; }
        });
        if (!best) return;
        this.parentOf[my] = best;
        if (!this.childrenOf[best]) this.childrenOf[best] = [];
        this.childrenOf[best].push(my);
      });

      this.addToggle();
      if (cfg.threadQuotes) this.thread();
    },

    addToggle() {
      const t = document.querySelector('.letters') || document.querySelector('header') || document.querySelector('nav');
      if (!t) return;
      const l = document.createElement('label'); l.className = 'ffe-threading-toggle';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = cfg.threadQuotes;
      cb.addEventListener('change', () => { cb.checked ? this.thread() : this.unthread(); });
      l.appendChild(cb); l.appendChild(document.createTextNode(' Threading')); t.appendChild(l);
    },

    thread() {
      if (this.threaded) return;
      this.threaded = true;
      const isChild = new Set(Object.keys(this.parentOf));
      const build = (pn) => {
        const ch = this.childrenOf[pn];
        if (!ch?.length) return null;
        const c = document.createElement('div'); c.className = 'ffe-thread-container'; c.dataset.parentNum = pn;
        for (const cn of ch) { const ca = findPostArticle(cn); if (ca) { c.appendChild(ca); const sc = build(cn); if (sc) c.appendChild(sc); } }
        return c.children.length ? c : null;
      };
      for (const a of getAllPosts()) {
        const n = getPostNum(a); if (!n || isChild.has(n)) continue;
        a.classList.add('ffe-threadOP');
        const st = build(n); if (st) a.after(st);
      }
      this.addFoldButtons();
    },

    addFoldButtons() {
      for (const pn of Object.keys(this.childrenOf)) {
        const pa = findPostArticle(pn); if (!pa || pa.querySelector('.ffe-thread-toggle')) continue;
        const cont = pa.nextElementSibling;
        if (!cont?.classList.contains('ffe-thread-container')) continue;
        const cc = this.childrenOf[pn].length;
        const header = pa.querySelector('.post_data') || pa.querySelector('header');
        if (!header) continue;

        // [−] / [+] — toggle direct children only
        const btn = document.createElement('span'); btn.className = 'ffe-thread-toggle';
        btn.textContent = '[\u2212]'; btn.title = `${cc} repl${cc===1?'y':'ies'}`;
        btn.addEventListener('click', () => {
          const col = cont.classList.toggle('ffe-collapsed');
          btn.textContent = col ? '[+]' : '[\u2212]';
        });
        header.insertBefore(btn, header.firstChild);

        // [++] / [−−] — single toggle button for ALL nested replies
        const hasNested = cont.querySelector('.ffe-thread-container');
        if (hasNested) {
          let allExpanded = true;
          const allBtn = document.createElement('span'); allBtn.className = 'ffe-thread-toggle ffe-thread-toggle-all';
          allBtn.textContent = '[++]'; allBtn.title = 'Expand/collapse all nested replies';
          allBtn.addEventListener('click', () => {
            allExpanded = !allExpanded;
            if (allExpanded) {
              // Expand all
              cont.classList.remove('ffe-collapsed');
              btn.textContent = '[\u2212]';
              cont.querySelectorAll('.ffe-thread-container').forEach(c => c.classList.remove('ffe-collapsed'));
              // Update all direct [+]/[−] buttons inside to [−]
              cont.querySelectorAll('.ffe-thread-toggle').forEach(t => {
                if (t !== allBtn && (t.textContent === '[+]')) t.textContent = '[\u2212]';
              });
              allBtn.textContent = '[\u2212\u2212]';
            } else {
              // Collapse all
              cont.querySelectorAll('.ffe-thread-container').forEach(c => c.classList.add('ffe-collapsed'));
              cont.querySelectorAll('.ffe-thread-toggle').forEach(t => {
                if (t !== allBtn && (t.textContent === '[\u2212]')) t.textContent = '[+]';
              });
              cont.classList.add('ffe-collapsed');
              btn.textContent = '[+]';
              allBtn.textContent = '[++]';
            }
          });
          btn.after(allBtn);
        }
      }
    },

    unthread() {
      if (!this.threaded) return; this.threaded = false;
      document.querySelectorAll('.ffe-thread-toggle').forEach(b => b.remove());
      document.querySelectorAll('.ffe-thread-container').forEach(c => { while (c.firstChild) c.before(c.firstChild); c.remove(); });
      for (const e of this.origPositions) {
        if (e.nextSib?.parentNode === e.parent) e.parent.insertBefore(e.el, e.nextSib);
        else e.parent.appendChild(e.el);
      }
      document.querySelectorAll('.ffe-threadOP').forEach(el => el.classList.remove('ffe-threadOP'));
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  6. GOON MODE
  // ═══════════════════════════════════════════════════════════════════════

  const GoonMode = {
    active: false, classified: false,
    init() {
      if (!cfg.goonMode) return;
      const t = document.querySelector('.letters') || document.querySelector('header') || document.querySelector('nav');
      if (!t) return;
      const ind = document.createElement('span'); ind.className = 'ffe-goon-indicator'; ind.textContent = 'G';
      ind.title = 'Goon Mode'; ind.addEventListener('click', () => this.toggle()); t.appendChild(ind);
    },
    classify() { if (this.classified) return; this.classified = true; document.querySelectorAll('article.post').forEach(a => { if (!a.querySelector('.thread_image_link')) a.classList.add('ffe-noimage'); }); },
    toggle() { this.active = !this.active; if (this.active) this.classify(); doc.classList.toggle('ffe-goonMode', this.active); }
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  6b. MD5 FILTER
  // ═══════════════════════════════════════════════════════════════════════

  const MD5Filter = {
    active: false,
    init() {
      if (!cfg.md5Tracking) return;
      const t = document.querySelector('.letters') || document.querySelector('header') || document.querySelector('nav');
      if (!t) return;
      const ind = document.createElement('span'); ind.className = 'ffe-md5filter-indicator'; ind.textContent = 'M';
      ind.title = 'MD5 Filter Mode'; ind.addEventListener('click', () => this.toggle()); t.appendChild(ind);
    },
    toggle() {
      this.active = !this.active;
      if (this.active) {
        this.apply();
      } else {
        document.querySelectorAll('.ffe-md5-hidden').forEach(a => a.classList.remove('ffe-md5-hidden'));
      }
      doc.classList.toggle('ffe-md5Filter', this.active);
    },
    apply() {
      // Only filter article.post elements — never hide article.thread (it wraps everything)
      const trackedPostNums = new Set();
      document.querySelectorAll('article.post').forEach(a => {
        if (a.classList.contains('ffe-md5-tracked')) {
          const pn = getPostNum(a);
          if (pn) trackedPostNums.add(pn);
        }
      });
      // Also count OP as tracked if its image matches
      document.querySelectorAll('article.thread').forEach(a => {
        const md5 = getPostMD5(a);
        if (md5 && trackedMD5s.has(md5)) {
          const pn = getPostNum(a);
          if (pn) trackedPostNums.add(pn);
        }
      });

      document.querySelectorAll('article.post').forEach(a => {
        if (a.classList.contains('ffe-md5-tracked')) return;

        const textEl = a.querySelector('.text');
        if (textEl) {
          const links = textEl.querySelectorAll('a.backlink, a[data-backlink], a[data-post]');
          for (const link of links) {
            const target = getQuoteTarget(link);
            if (target && trackedPostNums.has(target)) return;
          }
        }

        a.classList.add('ffe-md5-hidden');
      });
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  7. MD5 FEATURES
  // ═══════════════════════════════════════════════════════════════════════

  function initMD5Features() {
    if (!cfg.md5Tracking) return;
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.ffe-md5-dropdown') && !e.target.closest('.ffe-md5-menu-btn'))
        document.querySelectorAll('.ffe-md5-dropdown').forEach(d => d.remove());
    });
    highlightTrackedPosts();
    getAllPosts().forEach(a => addMD5MenuButton(a));
  }

  function getPostSameLink(article) {
    // Works for both OP (article.thread) and replies (article.post)
    // View Same link is always inside the article — in .post_file_controls (OP)
    // or .post_file > .post_file_controls (replies)
    return article.querySelector('a[href*="/search/image/"]') || null;
  }

  function addMD5MenuButton(article) {
    const md5 = getPostMD5(article); if (!md5) return;

    // Find the specific "View Same" link for this post
    const sameLink = getPostSameLink(article);
    // Only add one ▼ per "View Same" link — mark it once processed
    if (sameLink && sameLink.dataset.ffeMd5Btn) return;
    if (!sameLink && article.querySelector('.ffe-md5-menu-btn')) return;

    const btn = document.createElement('a'); btn.className = 'ffe-md5-menu-btn'; btn.textContent = '\u25BC'; btn.href = '#';
    btn.style.cssText = 'cursor:pointer;margin-left:4px;font-size:11px;color:#81a2be;text-decoration:none;';
    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleMD5Dropdown(btn, md5); });

    if (sameLink) {
      sameLink.dataset.ffeMd5Btn = '1';
      // Place before filename link if present (like replies), otherwise after View Same
      const container = sameLink.closest('.post_file') || sameLink.closest('.post_file_controls') || sameLink.parentElement;
      const filenameEl = container?.querySelector('.post_file_filename');
      if (filenameEl) {
        filenameEl.before(btn);
      } else {
        sameLink.after(btn);
      }
    } else {
      // No View Same link — place in post_file_controls (OP) or post_data/header (reply)
      const fi = article.querySelector('.post_file_controls') || article.querySelector('.post_data') || article.querySelector('header');
      if (fi) fi.prepend(btn);
    }
  }

  function toggleMD5Dropdown(btn, md5) {
    const existing = document.querySelector('.ffe-md5-dropdown');
    const wasOurs = existing && existing.dataset.ffeMd5 === md5;
    document.querySelectorAll('.ffe-md5-dropdown').forEach(d => d.remove());
    if (wasOurs) return; // toggle closed
    const dd = document.createElement('div'); dd.className = 'ffe-md5-dropdown';
    dd.dataset.ffeMd5 = md5;

    const items = [
      { text: 'Copy MD5', action: () => { copyToClipboard(md5); dd.remove(); } },
      { text: 'View Same (All Boards)', href: `https://archived.moe/_/search/image/${md5}/`, target: '_blank' },
      { text: `View Same (/${currentBoard}/)`, href: `/${currentBoard}/search/image/${md5}/`, target: '_blank' },
      { text: trackedMD5s.has(md5) ? 'Untrack MD5' : 'Track MD5', action: () => {
        trackedMD5s.has(md5) ? trackedMD5s.delete(md5) : trackedMD5s.add(md5);
        saveTrackedMD5s(); highlightTrackedPosts(); dd.remove();
      }}
    ];

    items.forEach(it => {
      const a = document.createElement('a');
      a.textContent = it.text;
      if (it.href) { a.href = it.href; a.target = it.target || ''; }
      if (it.action) a.addEventListener('click', (e) => { e.preventDefault(); it.action(); });
      dd.appendChild(a);
    });

    const r = btn.getBoundingClientRect();
    dd.style.left = r.left + 'px'; dd.style.top = (r.bottom + 2) + 'px';
    document.body.appendChild(dd);
  }

  function highlightTrackedPosts() {
    // Highlight individual reply posts (article.post)
    document.querySelectorAll('article.post').forEach(a => {
      const md5 = getPostMD5(a);
      a.classList.toggle('ffe-md5-tracked', !!(md5 && trackedMD5s.has(md5)));
    });
    // For OP: highlight the .thread_image_box, never the article.thread container
    document.querySelectorAll('article.thread').forEach(a => {
      a.classList.remove('ffe-md5-tracked'); // never highlight the thread wrapper
      const md5 = getPostMD5(a);
      const box = a.querySelector(':scope > .thread_image_box');
      if (box) box.classList.toggle('ffe-md5-tracked', !!(md5 && trackedMD5s.has(md5)));
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  8. SAVED THREADS
  // ═══════════════════════════════════════════════════════════════════════

  let headerControls = null;
  let topbarLeft = null;
  let topbarRight = null;

  function initSavedThreads() {
    if (!cfg.savedThreads) return;
    const target = topbarRight || headerControls;

    // [Saved] link — bookmark icon
    const savedLink = document.createElement('a');
    savedLink.appendChild(icons.bookmark());
    savedLink.title = 'Saved Threads';
    savedLink.href = '#';
    savedLink.addEventListener('click', (e) => { e.preventDefault(); toggleSavedDropdown(savedLink); });

    // On thread pages: heart icon for save/unsave
    if (isThreadPage) {
      const threadUrl = location.href.replace(/#.*/, '');
      const isSaved = savedThreadsList.some(t => t.url === threadUrl);
      const saveBtn = document.createElement('a');
      saveBtn.appendChild(isSaved ? icons.heartFilled() : icons.heartOutline());
      saveBtn.title = isSaved ? 'Unsave Thread' : 'Save Thread';
      saveBtn.href = '#';
      saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const url = threadUrl;
        const idx = savedThreadsList.findIndex(t => t.url === url);
        if (idx >= 0) {
          savedThreadsList.splice(idx, 1);
          saveBtn.innerHTML = '';
          saveBtn.appendChild(icons.heartOutline());
          saveBtn.title = 'Save Thread';
        } else {
          const title = document.querySelector('.post_title')?.textContent?.trim()
            || document.querySelector('article.thread .text, article.post .text')?.textContent?.trim()?.substring(0, 80)
            || `Thread #${location.pathname.match(/\/(\d+)/)?.[1] || '?'}`;
          savedThreadsList.unshift({ url, title, board: currentBoard, addedAt: new Date().toISOString() });
          saveBtn.innerHTML = '';
          saveBtn.appendChild(icons.heartFilled());
          saveBtn.title = 'Unsave Thread';
        }
        saveSavedThreads();
      });
      if (target) target.appendChild(saveBtn);
    }

    // Auto-update saved thread title when visiting the thread
    if (isThreadPage) {
      const threadUrl = location.href.replace(/#.*/, '');
      const saved = savedThreadsList.find(t => t.url === threadUrl);
      if (saved && /^Thread #\d+$/.test(saved.title)) {
        const pageTitle = document.querySelector('.post_title')?.textContent?.trim()
          || document.querySelector('article.thread .text, article.post .text')?.textContent?.trim()?.substring(0, 80);
        if (pageTitle) { saved.title = pageTitle; saveSavedThreads(); }
      }
    }

    if (target) target.appendChild(savedLink);
  }

  function toggleSavedDropdown(anchor) {
    const existing = document.querySelector('.ffe-saved-dropdown');
    if (existing) { existing.remove(); return; }

    const dd = document.createElement('div'); dd.className = 'ffe-saved-dropdown';
    const r = anchor.getBoundingClientRect();
    dd.style.left = Math.min(r.left, window.innerWidth - 340) + 'px';
    dd.style.top = (r.bottom + 4) + 'px';

    function render() {
      dd.innerHTML = '';
      if (savedThreadsList.length === 0) {
        dd.innerHTML = '<div class="ffe-saved-empty">No saved threads</div>';
      } else {
        savedThreadsList.forEach((t, i) => {
          const item = document.createElement('div'); item.className = 'ffe-saved-item';
          const board = document.createElement('span'); board.className = 'ffe-saved-board'; board.textContent = `/${t.board}/`;

          // Smart redirect: rewrite URL domain based on board
          const link = document.createElement('a');
          const boardHost = BOARD_HOSTS[t.board] || 'archived.moe';
          try {
            const parsed = new URL(t.url);
            parsed.hostname = boardHost;
            link.href = parsed.toString();
          } catch {
            link.href = t.url;
          }
          link.textContent = t.title;
          link.title = link.href;
          link.target = '_blank';
          link.rel = 'noopener';

          const rm = document.createElement('span'); rm.className = 'ffe-saved-remove'; rm.textContent = '\u00d7'; rm.title = 'Remove';
          rm.addEventListener('click', () => { savedThreadsList.splice(i, 1); saveSavedThreads(); render(); });
          item.appendChild(board); item.appendChild(link); item.appendChild(rm);
          dd.appendChild(item);
        });
      }

      // Manual add row — always shown
      const addRow = document.createElement('div');
      addRow.style.cssText = 'display:flex;gap:4px;padding:6px 8px;border-top:1px solid #444;';
      const addInput = document.createElement('input');
      addInput.style.cssText = 'flex:1;background:#1d1f21;border:1px solid #555;color:#c5c8c6;padding:2px 6px;font-size:11px;';
      addInput.placeholder = 'URL, board/number, or 4chan link...';
      const addBtn = document.createElement('button');
      addBtn.textContent = 'Add';
      addBtn.style.cssText = 'background:#373b41;border:1px solid #555;color:#c5c8c6;padding:2px 8px;cursor:pointer;font-size:11px;';
      addBtn.addEventListener('click', () => {
        const raw = addInput.value.trim(); if (!raw) return;
        addInput.style.borderColor = '#555';
        let board, threadId;
        // Archive URL
        const archiveM = raw.match(/https?:\/\/[^/]+\/([a-z0-9]+)\/thread\/(\d+)/i);
        // 4chan URL
        const chanM = raw.match(/https?:\/\/boards\.4chan(?:nel)?\.org\/([a-z0-9]+)\/thread\/(\d+)/i);
        // Shorthand: board/number or board number
        const shortM = raw.match(/^([a-z0-9]+)[\/\s]+(\d+)$/i);
        // Path only: /board/thread/number
        const pathM = raw.match(/^\/([a-z0-9]+)\/thread\/(\d+)/i);
        if (archiveM) { board = archiveM[1]; threadId = archiveM[2]; }
        else if (chanM) { board = chanM[1]; threadId = chanM[2]; }
        else if (shortM) { board = shortM[1]; threadId = shortM[2]; }
        else if (pathM) { board = pathM[1]; threadId = pathM[2]; }
        else { addInput.style.borderColor = '#cc6666'; return; }
        const host = BOARD_HOSTS[board] || 'archived.moe';
        const url = `https://${host}/${board}/thread/${threadId}/`;
        if (savedThreadsList.some(t => t.url === url)) { addInput.value = ''; return; }
        savedThreadsList.unshift({ url, title: `Thread #${threadId}`, board, addedAt: new Date().toISOString() });
        saveSavedThreads(); addInput.value = ''; render();
      });
      addRow.appendChild(addInput); addRow.appendChild(addBtn);
      dd.appendChild(addRow);

      // Footer: Export / Bulk Import / Clear All
      const footer = document.createElement('div'); footer.className = 'ffe-saved-footer';
      footer.style.cssText = 'display:flex;gap:8px;padding:4px 8px;border-top:1px solid #444;font-size:11px;flex-wrap:wrap;';

      if (savedThreadsList.length > 0) {
        const exportBtn = document.createElement('a'); exportBtn.textContent = 'Export';
        exportBtn.addEventListener('click', () => {
          const lines = savedThreadsList.map(t => {
            const host = BOARD_HOSTS[t.board] || 'archived.moe';
            return `https://${host}/${t.board}/thread/${t.url.match(/\/thread\/(\d+)/)?.[1] || ''}/ # ${t.title}`;
          });
          const blob = new Blob([lines.join('\n')], {type:'text/plain'});
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ffe-saved-threads.txt'; a.click(); URL.revokeObjectURL(a.href);
        });
        footer.appendChild(exportBtn);
      }

      const bulkBtn = document.createElement('a'); bulkBtn.textContent = 'Bulk Import';
      bulkBtn.addEventListener('click', () => {
        const bulkArea = dd.querySelector('.ffe-bulk-import');
        if (bulkArea) { bulkArea.remove(); return; }
        const wrap = document.createElement('div'); wrap.className = 'ffe-bulk-import';
        wrap.style.cssText = 'padding:6px 8px;border-top:1px solid #444;';
        const ta = document.createElement('textarea');
        ta.style.cssText = 'width:100%;height:80px;background:#1d1f21;border:1px solid #555;color:#c5c8c6;font-size:11px;resize:vertical;';
        ta.placeholder = 'Paste thread URLs or board/number (one per line):\nhttps://archived.moe/a/thread/123/\nhttps://boards.4chan.org/g/thread/456\ng/789\ng 789';
        const importBtn = document.createElement('button');
        importBtn.textContent = 'Import'; importBtn.style.cssText = 'margin-top:4px;background:#373b41;border:1px solid #555;color:#c5c8c6;padding:2px 8px;cursor:pointer;font-size:11px;';
        const statusMsg = document.createElement('span'); statusMsg.style.cssText = 'margin-left:6px;font-size:11px;';
        importBtn.addEventListener('click', () => {
          const lines = ta.value.split('\n').map(l => l.replace(/#.*$/, '').trim()).filter(Boolean);
          let added = 0;
          for (const line of lines) {
            let board, threadId, url;
            // Full archive URL: https://archived.moe/a/thread/123/
            const archiveM = line.match(/https?:\/\/[^/]+\/([a-z0-9]+)\/thread\/(\d+)/i);
            // 4chan URL: https://boards.4chan.org/g/thread/123 or https://boards.4channel.org/g/thread/123
            const chanM = line.match(/https?:\/\/boards\.4chan(?:nel)?\.org\/([a-z0-9]+)\/thread\/(\d+)/i);
            // Shorthand: board/number or board number
            const shortM = line.match(/^([a-z0-9]+)[\/\s]+(\d+)$/i);
            if (archiveM) { board = archiveM[1]; threadId = archiveM[2]; }
            else if (chanM) { board = chanM[1]; threadId = chanM[2]; }
            else if (shortM) { board = shortM[1]; threadId = shortM[2]; }
            else continue;
            const host = BOARD_HOSTS[board] || 'archived.moe';
            url = `https://${host}/${board}/thread/${threadId}/`;
            if (savedThreadsList.some(t => t.url === url)) continue;
            savedThreadsList.unshift({ url, title: `Thread #${threadId}`, board, addedAt: new Date().toISOString() });
            added++;
          }
          if (added > 0) { saveSavedThreads(); render(); }
          statusMsg.textContent = added > 0 ? `Added ${added} thread${added > 1 ? 's' : ''}.` : 'No new threads to add.';
          statusMsg.style.color = added > 0 ? '#b5bd68' : '#888';
        });
        wrap.appendChild(ta); wrap.appendChild(importBtn); wrap.appendChild(statusMsg);
        dd.appendChild(wrap);
      });
      footer.appendChild(bulkBtn);

      if (savedThreadsList.length > 0) {
        const clearAll = document.createElement('a'); clearAll.textContent = 'Clear All'; clearAll.style.color = '#cc6666';
        clearAll.addEventListener('click', () => { if (confirm('Remove all saved threads?')) { savedThreadsList.length = 0; saveSavedThreads(); render(); } });
        footer.appendChild(clearAll);
      }
      dd.appendChild(footer);
    }
    render();
    document.body.appendChild(dd);

    // Only close when clicking the bookmark icon again (not on outside click)
    // This keeps the dropdown persistent while adding threads
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  9. CUSTOM BOARD NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════

  function initBoardNav() {
    if (!cfg.boardNavEnabled) return;
    const customBoards = cfg.customBoardNav.trim();
    if (!customBoards) return;

    const nativeNav = document.querySelector('.letters');
    if (nativeNav) nativeNav.style.display = 'none';

    const nav = document.createElement('div'); nav.className = 'ffe-board-nav';
    const toggle = document.createElement('span'); toggle.className = 'ffe-board-nav-toggle';
    toggle.textContent = '[ \u2212 ]';
    let showingCustom = true;
    toggle.addEventListener('click', () => {
      showingCustom = !showingCustom;
      if (nativeNav) nativeNav.style.display = showingCustom ? 'none' : '';
      customLinks.style.display = showingCustom ? '' : 'none';
      toggle.textContent = showingCustom ? '[ \u2212 ]' : '[ + ]';
    });
    nav.appendChild(toggle);

    const customLinks = document.createElement('span');
    const boards = customBoards.split(/[,\s]+/).filter(Boolean);
    boards.forEach((b, i) => {
      if (i > 0) customLinks.appendChild(document.createTextNode(' / '));
      const a = document.createElement('a');
      const url = getBoardUrl(b);
      a.href = url;
      a.textContent = b;
      if (b === currentBoard) a.className = 'ffe-board-current';
      if (url.startsWith('https://')) { a.target = '_blank'; a.rel = 'noopener'; }
      customLinks.appendChild(a);
    });
    nav.appendChild(customLinks);

    // Insert into unified topbar if available, else fallback to native nav position
    if (topbarLeft) {
      topbarLeft.appendChild(nav);
    } else if (nativeNav) {
      nativeNav.before(nav);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  10. VIEW ON ORIGINAL BOARD
  // ═══════════════════════════════════════════════════════════════════════

  function initViewOriginalBoard() {
    // Only on archived.moe thread pages for cross-hosted boards
    if (!isThreadPage || !isBlockedExpansion) return;

    const canonicalHost = BOARD_HOSTS[currentBoard];
    if (!canonicalHost) return;
    const threadNum = location.pathname.match(/\/thread\/(\d+)/)?.[1];
    if (!threadNum) return;

    getAllPosts().forEach(article => {
      if (article.querySelector('.ffe-view-original-corner')) return;
      const wrapper = article.querySelector('.post_wrapper') || article.closest('.post_wrapper');
      if (wrapper?.querySelector('.ffe-view-original-corner')) return;
      const postNum = getPostNum(article);
      // Anchor format on target archives: board_postnum (no s_ prefix issue)
      const url = `https://${canonicalHost}/${currentBoard}/thread/${threadNum}/#${postNum}`;

      // Bottom-right corner link only
      const target = wrapper || article;
      const corner = document.createElement('a');
      corner.className = 'ffe-view-original-corner';
      corner.href = url;
      corner.target = '_blank';
      corner.rel = 'noopener';
      corner.appendChild(icons.externalLink());
      corner.appendChild(document.createTextNode(` ${canonicalHost.replace('.com','')}`));
      target.appendChild(corner);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  10b. CROSS-ARCHIVE LINK REDIRECT
  // ═══════════════════════════════════════════════════════════════════════

  function initCrossArchiveRedirect() {
    // On archived.moe, intercept clicks on links pointing to cross-hosted boards
    // and redirect them to the correct archive (thebarchive/archiveofsins)
    if (currentHost !== 'archived.moe') return;

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.href;
      // Match links like /b/thread/123, /s/search/..., /hc/, etc. on this same host
      const m = href.match(/^https?:\/\/(?:www\.)?archived\.moe\/([^/]+)(\/.*)?$/);
      if (!m) return;
      const board = m[1];
      const rest = m[2] || '/';
      const targetHost = BOARD_HOSTS[board];
      if (!targetHost) return; // not a cross-hosted board
      // Don't redirect links pointing to the current page (same thread, just anchor scrolling)
      const sameThread = isThreadPage && board === currentBoard &&
        a.pathname === location.pathname;
      if (sameThread) return;
      e.preventDefault();
      e.stopPropagation();
      const newUrl = `https://${targetHost}/${board}${rest}`;
      if (a.target === '_blank') {
        window.open(newUrl, '_blank');
      } else {
        window.location.href = newUrl;
      }
    }, true); // capture phase to intercept before other handlers
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  11. GALLERY
  // ═══════════════════════════════════════════════════════════════════════

  const Gallery = {
    el: null, nodes: {}, images: [], currentIndex: 0, slideshow: false, slideshowTimer: null, rotation: 0, delay: cfg.galSlideDelay,

    init() {
      if (!cfg.galleryEnabled) return;
      if (isIndexPage) return;
      if (isBlockedExpansion) return; // No gallery on blocked boards
      document.addEventListener('dblclick', (e) => {
        const link = e.target.closest('.thread_image_link'); if (!link) return;
        e.preventDefault(); e.stopPropagation();
        const pn = getPostNum(link.closest('article.thread, article.post'));
        const entries = getAllMediaEntries();
        this.open(Math.max(0, entries.findIndex(m => m.postNum === pn)));
      });
    },

    build() {
      const el = document.createElement('div'); el.id = 'ffe-gallery';
      ['gal-fit-width','gal-fit-height','gal-stretch','gal-hide-thumbnails'].forEach(c => el.classList.toggle(c, !!cfg[{
        'gal-fit-width':'galFitWidth','gal-fit-height':'galFitHeight','gal-stretch':'galStretchToFit','gal-hide-thumbnails':'galHideThumbnails'
      }[c]]));
      el.innerHTML = `<div class="gal-viewport"><div class="gal-topbar"><div class="gal-labels"><span class="gal-count"><span class="gal-count-current"></span> / <span class="gal-count-total"></span></span><a class="gal-name" target="_blank"></a></div><div class="gal-buttons"><a class="gal-start" title="Start slideshow"><i></i></a><a class="gal-stop" title="Stop slideshow"><i></i></a><a class="gal-menu-btn" title="Options">\u2630</a><a class="gal-close" title="Close (Esc)">\u00d7</a></div></div><div class="gal-menu"><label><input type="checkbox" data-opt="galFitWidth"> Fit Width</label><label><input type="checkbox" data-opt="galFitHeight"> Fit Height</label><label><input type="checkbox" data-opt="galStretchToFit"> Stretch to Fit</label><label><input type="checkbox" data-opt="galHideThumbnails"> Hide Thumbnails</label><label><input type="checkbox" data-opt="galScrollToPost"> Scroll to Post</label><label class="gal-delay-label">Slide Delay: <input type="number" min="0" step="0.5" value="${this.delay}" class="gal-delay-input"> s</label></div><div class="gal-prev" title="Previous"></div><div class="gal-image"></div><div class="gal-next" title="Next"></div></div><div class="gal-thumbnails"></div>`;
      const q = s => el.querySelector(s);
      this.nodes = { frame: q('.gal-image'), name: q('.gal-name'), countCur: q('.gal-count-current'), countTotal: q('.gal-count-total'), thumbs: q('.gal-thumbnails'), menu: q('.gal-menu'), buttons: q('.gal-buttons') };
      q('.gal-close').addEventListener('click', () => this.close());
      q('.gal-prev').addEventListener('click', () => this.navigate(-1));
      q('.gal-next').addEventListener('click', () => this.navigate(1));
      q('.gal-start').addEventListener('click', () => this.startSlideshow());
      q('.gal-stop').addEventListener('click', () => this.stopSlideshow());
      q('.gal-menu-btn').addEventListener('click', (e) => { e.stopPropagation(); this.nodes.menu.classList.toggle('gal-menu-open'); });
      el.addEventListener('click', (e) => { if (!e.target.closest('.gal-menu,.gal-menu-btn')) this.nodes.menu.classList.remove('gal-menu-open'); });
      // Download current image button — bottom-right, styled like thread download button
      const galDlBtn = document.createElement('button'); galDlBtn.className = 'gal-dl-btn';
      galDlBtn.appendChild(icons.download());
      galDlBtn.appendChild(document.createTextNode(' Download'));
      galDlBtn.title = 'Download current image';
      galDlBtn.addEventListener('click', () => {
        const e = this.images[this.currentIndex]; if (!e) return;
        downloadFile(e.url, e.filename);
      });
      q('.gal-viewport').appendChild(galDlBtn);
      el.querySelectorAll('.gal-menu input[type="checkbox"]').forEach(cb => {
        cb.checked = !!cfg[cb.dataset.opt];
        cb.addEventListener('change', () => { cfg[cb.dataset.opt] = cb.checked; saveSettings(cfg); this.applyFit(); });
      });
      q('.gal-delay-input').addEventListener('change', (e) => { this.delay = parseFloat(e.target.value)||6; cfg.galSlideDelay = this.delay; saveSettings(cfg); });
      // Click zones — dynamic based on image size
      // On the image: left 10% of image = prev, rest = next
      // Off the image: nav zones = gap between frame edge and image edge (max 10% of frame), rest = close
      // Videos: no click interception (has own controls), off-video clicks = close or edge nav
      this.nodes.frame.addEventListener('click', (e) => {
        if (e.target.closest('.gal-topbar,.gal-menu,.gal-dl-btn,.gal-prev,.gal-next')) return;
        const frameRect = this.nodes.frame.getBoundingClientRect();
        const media = this.nodes.frame.querySelector('img, video');
        const isVideo = media?.tagName === 'VIDEO';
        let onMedia = false;
        if (media) {
          const mr = media.getBoundingClientRect();
          onMedia = e.clientX >= mr.left && e.clientX <= mr.right && e.clientY >= mr.top && e.clientY <= mr.bottom;
        }
        if (onMedia && isVideo) return;
        if (onMedia) {
          const imgRect = media.getBoundingClientRect();
          const xInImg = (e.clientX - imgRect.left) / imgRect.width;
          if (xInImg < 0.10) this.navigate(-1);
          else this.navigate(1);
        } else {
          // Dynamic edge nav zones: the gap between frame edge and image edge, capped at 10% of frame
          const maxZone = frameRect.width * 0.10;
          const mr = media?.getBoundingClientRect();
          const leftGap = mr ? Math.max(0, mr.left - frameRect.left) : 0;
          const rightGap = mr ? Math.max(0, frameRect.right - mr.right) : 0;
          const leftZone = Math.min(leftGap, maxZone);
          const rightZone = Math.min(rightGap, maxZone);
          const xInFrame = e.clientX - frameRect.left;
          if (xInFrame <= leftZone) this.navigate(-1);
          else if (xInFrame >= frameRect.width - rightZone) this.navigate(1);
          else this.close();
        }
      });

      // Trackpad swipe — follows finger 1:1, then slides off smoothly
      const vp = q('.gal-viewport');
      let swipeOffset = 0, swiping = false, lastWheelTime = 0, swipeRaf = null;
      vp.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 0.5) return;
        if (Math.abs(e.deltaX) < 2) return;
        e.preventDefault();
        const media = this.nodes.frame.querySelector('img, video');
        if (!media || swiping) return;
        swipeOffset -= e.deltaX;
        media.style.transition = 'none';
        media.style.transform = `translateX(${swipeOffset}px)`;
        media.style.opacity = `${1 - Math.min(Math.abs(swipeOffset) / (vp.clientWidth * 0.4), 0.6)}`;
        lastWheelTime = Date.now();
        cancelAnimationFrame(swipeRaf);
        swipeRaf = requestAnimationFrame(() => {
          // Check if swipe gesture ended (no new wheel events for 60ms)
          setTimeout(() => {
            if (Date.now() - lastWheelTime < 55) return;
            const threshold = vp.clientWidth * 0.12;
            if (Math.abs(swipeOffset) > threshold) {
              swiping = true;
              const dir = swipeOffset < 0 ? 1 : -1;
              media.style.transition = 'transform 120ms ease-out, opacity 120ms ease-out';
              media.style.transform = `translateX(${-dir * vp.clientWidth}px)`;
              media.style.opacity = '0';
              setTimeout(() => { swiping = false; swipeOffset = 0; this.navigate(dir); }, 120);
            } else {
              // Snap back
              media.style.transition = 'transform 100ms ease-out, opacity 100ms ease-out';
              media.style.transform = '';
              media.style.opacity = '';
              swipeOffset = 0;
            }
          }, 60);
        });
      }, { passive: false });
      this.el = el;
    },

    applyFit() {
      if (!this.el) return;
      this.el.classList.toggle('gal-fit-width', cfg.galFitWidth);
      this.el.classList.toggle('gal-fit-height', cfg.galFitHeight);
      this.el.classList.toggle('gal-stretch', cfg.galStretchToFit);
      this.el.classList.toggle('gal-hide-thumbnails', cfg.galHideThumbnails);
    },

    findNearestIndex() {
      // Find the media entry whose post is closest to the top of the viewport (just below header)
      const entries = getAllMediaEntries();
      if (!entries.length) return 0;
      const headerH = document.querySelector('.ffe-topbar')?.offsetHeight || document.querySelector('.letters')?.offsetHeight || 0;
      const targetY = headerH + 10;
      let bestIdx = 0, bestDist = Infinity;
      entries.forEach((e, i) => {
        if (!e.article) return;
        const rect = e.article.getBoundingClientRect();
        const dist = Math.abs(rect.top - targetY);
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      });
      return bestIdx;
    },

    open(idx) {
      this.images = getAllMediaEntries(); if (!this.images.length) return;
      if (!this.el) this.build();
      // Close saved threads dropdown if open
      const savedDd = document.querySelector('.ffe-saved-dropdown');
      if (savedDd) savedDd.remove();
      document.body.appendChild(this.el); document.body.style.overflow = 'hidden';
      this.buildThumbnails(); this.currentIndex = Math.max(0, Math.min(idx||0, this.images.length-1));
      this.rotation = 0; this.show();
    },

    close() { this.stopSlideshow(); if (this.el?.parentNode) { this.el.remove(); document.body.style.overflow = ''; } },

    buildThumbnails() {
      const t = this.nodes.thumbs; t.innerHTML = '';
      this.images.forEach((e, i) => {
        const a = document.createElement('a');
        const img = document.createElement('img'); img.src = e.thumbSrc || e.url; img.loading = 'lazy';
        a.appendChild(img); a.addEventListener('click', () => { this.currentIndex = i; this.show(); }); t.appendChild(a);
      });
    },

    navigate(d) { this.currentIndex = (this.currentIndex + d + this.images.length) % this.images.length; this.rotation = 0; this.show(); },

    show() {
      const e = this.images[this.currentIndex]; if (!e) return;
      const frame = this.nodes.frame;
      const isVid = /\.(webm|mp4)$/i.test(e.url);
      // Revoke any existing blob URL before destroying the element
      const oldMedia = frame.querySelector('[data-ffe-blob-url]');
      if (oldMedia) URL.revokeObjectURL(oldMedia.dataset.ffeBlobUrl);
      frame.innerHTML = '';

      if (isVid) {
        frame.innerHTML = `<video src="${escapeHtml(e.url)}" controls autoplay loop style="display:block;margin:auto;"></video>`;
      } else {
        const img = document.createElement('img');
        img.style.cssText = 'display:block;margin:auto;';
        img.style.transform = `rotate(${this.rotation}deg)`;
        frame.appendChild(img);
        proxyLoadImage(e.url, (url, isBlob) => {
          img.src = url;
          if (isBlob) img.dataset.ffeBlobUrl = url;
        });
      }

      this.nodes.countCur.textContent = this.currentIndex + 1;
      this.nodes.countTotal.textContent = this.images.length;
      this.nodes.name.href = e.url; this.nodes.name.textContent = e.filename;
      this.nodes.thumbs.querySelectorAll('a').forEach((a, i) => a.classList.toggle('gal-thumb-active', i === this.currentIndex));
      this.nodes.thumbs.querySelector('.gal-thumb-active')?.scrollIntoView({ block: 'nearest' });
      if (cfg.galScrollToPost && e.article) {
        const headerH = document.querySelector('.ffe-topbar')?.offsetHeight || document.querySelector('.letters')?.offsetHeight || 0;
        const rect = e.article.getBoundingClientRect();
        window.scrollBy({ top: rect.top - headerH, behavior: 'smooth' });
      }
      if (this.slideshow) this.setupTimer();
    },

    rotate(d) { this.rotation = (this.rotation + d) % 360; const m = this.nodes.frame.querySelector('img,video'); if (m) m.style.transform = `rotate(${this.rotation}deg)`; },
    startSlideshow() { this.slideshow = true; this.nodes.buttons.classList.add('gal-playing'); this.setupTimer(); },
    stopSlideshow() { this.slideshow = false; this.nodes.buttons?.classList.remove('gal-playing'); this.cleanupTimer(); },
    setupTimer() {
      this.cleanupTimer();
      const v = this.nodes.frame.querySelector('video');
      if (v) { v.loop = false; v.addEventListener('ended', () => this.navigate(1), {once:true}); }
      else { this.slideshowTimer = setTimeout(() => this.navigate(1), this.delay * 1000); }
    },
    cleanupTimer() { if (this.slideshowTimer) { clearTimeout(this.slideshowTimer); this.slideshowTimer = null; } },
    handleKey(e) {
      if (!this.el?.parentNode) return false;
      switch (e.key) {
        case 'Escape': this.close(); return true;
        case 'ArrowLeft': if (e.shiftKey) this.rotate(-90); else if (e.ctrlKey) this.slideshow?this.stopSlideshow():this.startSlideshow(); else this.navigate(-1); return true;
        case 'ArrowRight': if (e.shiftKey) this.rotate(90); else if (e.ctrlKey) this.slideshow?this.stopSlideshow():this.startSlideshow(); else this.navigate(1); return true;
        case 'Enter': { const v = this.nodes.frame.querySelector('video'); if (v) v.paused?v.play():v.pause(); else this.navigate(1); return true; }
        case 'p': case 'P': { const v = this.nodes.frame.querySelector('video'); if (v) v.paused?v.play():v.pause(); return true; }
      }
      return false;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  12. DOWNLOADS
  // ═══════════════════════════════════════════════════════════════════════

  function downloadFile(url, filename) {
    if (typeof GM_download === 'function') { GM_download({ url, name: filename, saveAs: false }); }
    else { const a = document.createElement('a'); a.href = url; a.download = filename; a.target = '_blank'; document.body.appendChild(a); a.click(); a.remove(); }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  13. FLOATING PANEL (scroll nav + download + MD5 nav)
  // ═══════════════════════════════════════════════════════════════════════

  function initFloatingPanel() {
    const panel = document.createElement('div');
    panel.className = 'ffe-float-panel';

    // Download / redirect button (thread pages only)
    if (isThreadPage && cfg.batchDownload) {
      const dlBtn = document.createElement('button');
      dlBtn.className = 'ffe-float-dl';

      if (isBlockedExpansion) {
        // On blocked boards: redirect to original archive
        const canonicalHost = BOARD_HOSTS[currentBoard];
        const threadNum = location.pathname.match(/\/thread\/(\d+)/)?.[1];
        dlBtn.appendChild(icons.externalLink());
        dlBtn.appendChild(document.createTextNode(' Download On Original Board'));
        dlBtn.addEventListener('click', () => {
          if (canonicalHost && threadNum) {
            window.open(`https://${canonicalHost}/${currentBoard}/thread/${threadNum}/`, '_blank');
          }
        });
      } else {
        // Normal download
        dlBtn.appendChild(icons.download());
        dlBtn.appendChild(document.createTextNode(' Download Thread Media'));
        dlBtn.addEventListener('click', () => {
          const entries = getAllMediaEntries();
          if (!entries.length) { alert('No images found.'); return; }
          if (!confirm(`Download ${entries.length} files (including OP)?`)) return;
          let i = 0;
          (function next() {
            if (i >= entries.length) return;
            downloadFile(entries[i].url, entries[i].filename);
            i++;
            if (i < entries.length) setTimeout(next, cfg.batchDownloadDelay);
          })();
        });
      }
      panel.appendChild(dlBtn);
    }

    // Collapse / Expand all threaded replies — two separate buttons, always visible
    if (isThreadPage && cfg.quoteThreading) {
      const collapseBtn = document.createElement('button');
      collapseBtn.className = 'ffe-float-dl';
      collapseBtn.textContent = 'Collapse';
      collapseBtn.title = 'Collapse all threaded replies';
      collapseBtn.addEventListener('click', () => {
        document.querySelectorAll('.ffe-thread-container').forEach(c => c.classList.add('ffe-collapsed'));
        document.querySelectorAll('.ffe-thread-toggle:not(.ffe-thread-toggle-all)').forEach(b => { b.textContent = '[+]'; });
        document.querySelectorAll('.ffe-thread-toggle-all').forEach(b => { b.textContent = '[++]'; });
      });
      panel.appendChild(collapseBtn);

      const expandBtn = document.createElement('button');
      expandBtn.className = 'ffe-float-dl';
      expandBtn.textContent = 'Expand';
      expandBtn.title = 'Expand all threaded replies';
      expandBtn.addEventListener('click', () => {
        document.querySelectorAll('.ffe-thread-container').forEach(c => c.classList.remove('ffe-collapsed'));
        document.querySelectorAll('.ffe-thread-toggle:not(.ffe-thread-toggle-all)').forEach(b => { b.textContent = '[\u2212]'; });
        document.querySelectorAll('.ffe-thread-toggle-all').forEach(b => { b.textContent = '[\u2212\u2212]'; });
      });
      panel.appendChild(expandBtn);
    }

    // Previous tracked MD5 post button
    const skipPrevBtn = document.createElement('button');
    skipPrevBtn.className = 'ffe-float-skip-prev';
    skipPrevBtn.appendChild(icons.skipPrev());
    skipPrevBtn.title = 'Previous tracked MD5 post';
    skipPrevBtn.addEventListener('click', () => navigateTrackedMD5(-1));
    panel.appendChild(skipPrevBtn);

    // Up arrow
    const upBtn = document.createElement('button');
    upBtn.className = 'ffe-float-up';
    upBtn.appendChild(icons.arrowUp());
    upBtn.title = 'Go to top';
    upBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    panel.appendChild(upBtn);

    // Down arrow
    const downBtn = document.createElement('button');
    downBtn.className = 'ffe-float-down';
    downBtn.appendChild(icons.arrowDown());
    downBtn.title = 'Go to bottom';
    downBtn.addEventListener('click', () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
    panel.appendChild(downBtn);

    // Next tracked MD5 post button
    const skipNextBtn = document.createElement('button');
    skipNextBtn.className = 'ffe-float-skip-next';
    skipNextBtn.appendChild(icons.skipNext());
    skipNextBtn.title = 'Next tracked MD5 post';
    skipNextBtn.addEventListener('click', () => navigateTrackedMD5(1));
    panel.appendChild(skipNextBtn);

    document.body.appendChild(panel);

    // Throttled scroll handler
    let ticking = false;
    function updateArrows() {
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      upBtn.classList.toggle('ffe-float-hidden', scrollY <= 50);
      downBtn.classList.toggle('ffe-float-hidden', scrollY >= maxScroll - 50);
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(updateArrows); }
    });
    updateArrows();
  }

  function navigateTrackedMD5(direction) {
    const tracked = Array.from(document.querySelectorAll('.ffe-md5-tracked'));
    if (!tracked.length) return;

    // Account for fixed topbar height so posts don't hide behind it
    const topbar = document.querySelector('.ffe-topbar');
    const offset = topbar ? topbar.offsetHeight + 4 : 0;
    const scrollTop = window.scrollY + offset;

    function scrollToPost(el) {
      const y = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }

    if (direction < 0) {
      for (let i = tracked.length - 1; i >= 0; i--) {
        const postTop = tracked[i].getBoundingClientRect().top + window.scrollY;
        if (postTop < scrollTop - 5) { scrollToPost(tracked[i]); return; }
      }
      scrollToPost(tracked[tracked.length - 1]);
    } else {
      for (let i = 0; i < tracked.length; i++) {
        const postTop = tracked[i].getBoundingClientRect().top + window.scrollY;
        if (postTop > scrollTop + 50) { scrollToPost(tracked[i]); return; }
      }
      scrollToPost(tracked[0]);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  14. INDEX PAGE CUSTOMIZATION — promote pinned/tracked threads
  // ═══════════════════════════════════════════════════════════════════════

  function initIndexCustomization() {
    if (isIndexPage) {
      // Index/gallery thumbnail size
      const thumbSize = cfg.indexThumbSize;
      if (thumbSize && thumbSize !== 'default') {
        doc.classList.add('ffe-index-thumb-' + thumbSize);
      }
      // Promote pinned threads and MD5-tracked threads to top
      promoteSpecialThreads();
    }

    if (isThreadPage) {
      // Thread thumbnail size
      const tSize = cfg.threadThumbSize;
      if (tSize && tSize !== 'default') {
        doc.classList.add('ffe-thread-thumb-' + tSize);
      }
    }
  }

  function promoteSpecialThreads() {
    // Find all OP posts (first post in each thread) on index pages
    // On FoolFuuka index, threads are separated — each thread's OP is the first article
    const allArticles = document.querySelectorAll('article.thread, article.post');
    if (!allArticles.length) return;

    // Collect thread containers and check if they should be promoted
    const promoted = [];
    const normal = [];

    // On index pages, threads are often wrapped in containers or separated by <hr>
    // We work with the thread-level containers
    const threadContainers = document.querySelectorAll('div[id^="thread_"], article.thread, div.thread');

    if (threadContainers.length > 0) {
      threadContainers.forEach(tc => {
        const shouldPromote = checkThreadPromotion(tc);
        if (shouldPromote.pinned) {
          tc.classList.add('ffe-promoted');
          promoted.push({ el: tc, reason: 'pinned' });
        } else if (shouldPromote.md5) {
          tc.classList.add('ffe-promoted-md5');
          promoted.push({ el: tc, reason: 'md5' });
        } else {
          normal.push(tc);
        }
      });

      // Move promoted threads to top
      if (promoted.length > 0) {
        const parent = promoted[0].el.parentElement;
        if (parent) {
          // Insert promoted threads before the first normal thread
          const firstNormal = normal[0];
          promoted.forEach(p => {
            if (firstNormal) parent.insertBefore(p.el, firstNormal);
            else parent.appendChild(p.el);
          });
        }
      }
    } else {
      // Fallback: work with individual articles on index
      allArticles.forEach(article => {
        const threadLink = article.querySelector('a[href*="/thread/"]');
        const threadUrl = threadLink?.href || '';

        // Check if this thread is in saved threads
        const isPinned = savedThreadsList.some(t => {
          return threadUrl && threadUrl.includes(t.url.split('#')[0]);
        });

        // Check if any image in this thread has a tracked MD5
        const md5 = getPostMD5(article);
        const isMD5Tracked = md5 && trackedMD5s.has(md5);

        if (isPinned) article.classList.add('ffe-promoted');
        if (isMD5Tracked) article.classList.add('ffe-promoted-md5');
      });
    }
  }

  function checkThreadPromotion(container) {
    // Include the container itself if it's article.thread (it holds the OP image/links)
    const articles = [container, ...container.querySelectorAll('article.post')];
    let pinned = false, md5 = false;

    articles.forEach(article => {
      // Check saved/pinned
      const threadLink = article.querySelector('a[href*="/thread/"]');
      if (threadLink) {
        const href = threadLink.href;
        if (savedThreadsList.some(t => href.includes(t.url.split('#')[0]))) {
          pinned = true;
        }
      }
      // Check MD5 tracked
      const postMD5 = getPostMD5(article);
      if (postMD5 && trackedMD5s.has(postMD5)) md5 = true;
    });

    return { pinned, md5 };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  15. SETTINGS PANEL — "Archive Enhancer Settings"
  // ═══════════════════════════════════════════════════════════════════════

  function openSettings(initialTab) {
    if (document.getElementById('ffe-overlay')) return;

    const sections = {};
    for (const [key, meta] of Object.entries(SETTING_META)) {
      if (!sections[meta.section]) sections[meta.section] = [];
      sections[meta.section].push({ key, ...meta });
    }
    sections['MD5'] = null;
    const sectionNames = Object.keys(sections);

    const overlay = document.createElement('div'); overlay.id = 'ffe-overlay';
    const dialog = document.createElement('div'); dialog.id = 'ffe-settings';

    const nav = document.createElement('nav');
    const tabsDiv = document.createElement('div'); tabsDiv.className = 'ffe-tabs';
    const startTab = initialTab || sectionNames[0];
    sectionNames.forEach(name => {
      const tab = document.createElement('a'); tab.className = 'ffe-tab' + (name === startTab ? ' ffe-tab-selected' : '');
      tab.textContent = name; tab.dataset.section = name;
      tab.addEventListener('click', () => switchTab(name)); tabsDiv.appendChild(tab);
    });
    nav.appendChild(tabsDiv);
    const closeBtn = document.createElement('a'); closeBtn.className = 'ffe-close-btn'; closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', closeSettings); nav.appendChild(closeBtn);
    dialog.appendChild(nav);

    const sectionContainer = document.createElement('div'); sectionContainer.className = 'ffe-section-container';

    for (const sName of sectionNames) {
      const sec = document.createElement('div');
      sec.className = 'ffe-section' + (sName === startTab ? ' ffe-section-active' : '');
      sec.dataset.section = sName;

      if (sName === 'MD5') {
        renderMD5Manager(sec);
      } else {
        for (const item of sections[sName]) {
          const row = document.createElement('div'); row.className = 'ffe-option';
          const type = item.type || 'checkbox';

          if (type === 'checkbox') {
            const lbl = document.createElement('label');
            const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!cfg[item.key];
            cb.addEventListener('change', () => { cfg[item.key] = cb.checked; saveSettings(cfg); });
            lbl.appendChild(cb); lbl.appendChild(document.createTextNode(' ' + item.label)); row.appendChild(lbl);
          } else if (type === 'text' || type === 'text-wide' || type === 'number') {
            const lbl = document.createElement('label'); lbl.textContent = item.label + ': ';
            const input = document.createElement('input');
            input.type = type === 'number' ? 'number' : 'text';
            input.value = cfg[item.key];
            if (type === 'number') { input.min = 0; input.max = 10000; input.style.width = '70px'; }
            else if (type === 'text-wide') { input.className = 'ffe-text-wide'; }
            else { input.style.width = '60px'; }
            input.addEventListener('change', () => { cfg[item.key] = type === 'number' ? (parseFloat(input.value)||0) : input.value; saveSettings(cfg); });
            lbl.appendChild(input); row.appendChild(lbl);
          } else if (type === 'select') {
            const lbl = document.createElement('label'); lbl.textContent = item.label + ': ';
            const sel = document.createElement('select');
            for (const opt of item.options) { const o = document.createElement('option'); o.value = opt; o.textContent = opt; if (cfg[item.key] === opt) o.selected = true; sel.appendChild(o); }
            sel.addEventListener('change', () => { cfg[item.key] = sel.value; saveSettings(cfg); });
            lbl.appendChild(sel); row.appendChild(lbl);
          }
          const desc = document.createElement('span'); desc.className = 'ffe-desc'; desc.textContent = item.desc;
          row.appendChild(desc); sec.appendChild(row);
        }
      }
      sectionContainer.appendChild(sec);
    }
    dialog.appendChild(sectionContainer);

    // Footer
    const footer = document.createElement('div'); footer.className = 'ffe-footer';
    const statusEl = document.createElement('span'); statusEl.className = 'ffe-status';

    const exportLink = document.createElement('a'); exportLink.textContent = 'Export All';
    exportLink.addEventListener('click', () => {
      const allData = { settings: cfg, trackedMD5s: [...trackedMD5s], savedThreads: savedThreadsList };
      const blob = new Blob([JSON.stringify(allData, null, 2)], {type:'application/json'});
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ffe-backup.json'; a.click(); URL.revokeObjectURL(a.href);
      statusEl.textContent = 'Exported settings, MD5s, and saved threads!'; statusEl.style.color = '#b5bd68';
    });
    footer.appendChild(exportLink); footer.appendChild(document.createTextNode(' | '));

    const importLink = document.createElement('a'); importLink.textContent = 'Import All';
    const fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = '.json';
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          // Support both old format (flat settings) and new format (with sections)
          if (data.settings) {
            Object.assign(cfg, {...DEFAULTS, ...data.settings}); saveSettings(cfg);
            if (data.trackedMD5s?.length) { trackedMD5s = new Set(data.trackedMD5s); saveTrackedMD5s(); }
            if (data.savedThreads?.length) { savedThreadsList = data.savedThreads; saveSavedThreads(); }
            statusEl.textContent = 'Imported all data! Reload to apply.';
          } else {
            // Legacy: flat settings object
            Object.assign(cfg, {...DEFAULTS, ...data}); saveSettings(cfg);
            statusEl.textContent = 'Imported settings! Reload to apply.';
          }
          statusEl.style.color = '#b5bd68';
        } catch { statusEl.textContent = 'Invalid JSON.'; statusEl.style.color = '#cc6666'; }
      };
      reader.readAsText(file);
    });
    importLink.addEventListener('click', () => fileInput.click()); footer.appendChild(importLink); footer.appendChild(fileInput);
    footer.appendChild(document.createTextNode(' | '));

    const resetLink = document.createElement('a'); resetLink.textContent = 'Reset';
    resetLink.addEventListener('click', () => { if (!confirm('Reset all settings?')) return; Object.assign(cfg, DEFAULTS); saveSettings(cfg); statusEl.textContent = 'Reset! Reload to apply.'; });
    footer.appendChild(resetLink);

    footer.appendChild(Object.assign(document.createElement('span'), {className:'ffe-spacer'}));
    footer.appendChild(statusEl); footer.appendChild(document.createTextNode(' '));
    footer.appendChild(Object.assign(document.createElement('span'), {style:'color:#707880', textContent:`Archive Enhancer Settings v${VERSION}`}));
    dialog.appendChild(footer);

    overlay.appendChild(dialog); document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSettings(); });

    function switchTab(name) {
      dialog.querySelectorAll('.ffe-tab').forEach(t => t.classList.toggle('ffe-tab-selected', t.dataset.section === name));
      dialog.querySelectorAll('.ffe-section').forEach(s => s.classList.toggle('ffe-section-active', s.dataset.section === name));
    }
  }

  function renderMD5Manager(container) {
    const mgr = document.createElement('div'); mgr.className = 'ffe-md5-manager';

    const count = document.createElement('div');
    count.style.cssText = 'margin-bottom:6px;color:#888;';

    function refresh() {
      count.textContent = `${trackedMD5s.size} hash${trackedMD5s.size === 1 ? '' : 'es'} tracked`;
      list.innerHTML = '';
      if (trackedMD5s.size === 0) {
        list.innerHTML = '<div style="padding:12px;text-align:center;color:#666;font-style:italic;">No tracked hashes</div>';
        return;
      }
      for (const hash of trackedMD5s) {
        const entry = document.createElement('div'); entry.className = 'ffe-md5-entry';
        const span = document.createElement('span'); span.textContent = hash;
        const rm = document.createElement('a'); rm.textContent = '\u00d7'; rm.title = 'Remove';
        rm.addEventListener('click', () => { trackedMD5s.delete(hash); saveTrackedMD5s(); highlightTrackedPosts(); refresh(); });
        entry.appendChild(span); entry.appendChild(rm); list.appendChild(entry);
      }
    }

    mgr.appendChild(count);

    const list = document.createElement('div'); list.className = 'ffe-md5-list';
    mgr.appendChild(list);

    // Single hash add row
    const addRow = document.createElement('div'); addRow.className = 'ffe-md5-add';
    const addInput = document.createElement('input'); addInput.placeholder = 'Paste MD5 hash (base64)...';
    const addBtn = document.createElement('button'); addBtn.textContent = 'Add';
    addBtn.addEventListener('click', () => {
      const v = addInput.value.trim(); if (!v) return;
      trackedMD5s.add(v); saveTrackedMD5s(); highlightTrackedPosts(); addInput.value = ''; refresh();
    });
    addRow.appendChild(addInput); addRow.appendChild(addBtn);
    mgr.appendChild(addRow);

    // Bulk import textarea
    const bulkWrap = document.createElement('div'); bulkWrap.style.cssText = 'margin-top:8px;';
    const bulkLabel = document.createElement('div'); bulkLabel.style.cssText = 'font-size:11px;color:#888;margin-bottom:3px;';
    bulkLabel.textContent = 'Bulk import (one hash per line):';
    const bulkArea = document.createElement('textarea');
    bulkArea.style.cssText = 'width:100%;height:80px;background:#1d1f21;border:1px solid #555;color:#c5c8c6;padding:4px 6px;font-size:11px;font-family:monospace;resize:vertical;box-sizing:border-box;';
    bulkArea.placeholder = 'zIlsrrqc9tHGYGj9YgIdjg\nKibmdWOC0nHEOFS2tkhZ7A\n...';
    const bulkBtn = document.createElement('button');
    bulkBtn.textContent = 'Import All';
    bulkBtn.style.cssText = 'margin-top:4px;background:#373b41;border:1px solid #555;color:#c5c8c6;padding:3px 10px;cursor:pointer;font-size:12px;';
    bulkBtn.addEventListener('click', () => {
      const lines = bulkArea.value.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);
      if (!lines.length) return;
      let added = 0;
      for (const line of lines) {
        if (!trackedMD5s.has(line)) { trackedMD5s.add(line); added++; }
      }
      saveTrackedMD5s(); highlightTrackedPosts(); bulkArea.value = '';
      refresh();
      statusSpan.textContent = `Imported ${added} new hash${added === 1 ? '' : 'es'} (${lines.length - added} duplicate${lines.length - added === 1 ? '' : 's'} skipped)`;
      statusSpan.style.color = '#b5bd68';
    });
    bulkWrap.appendChild(bulkLabel); bulkWrap.appendChild(bulkArea); bulkWrap.appendChild(bulkBtn);
    mgr.appendChild(bulkWrap);

    // Action links row
    const actions = document.createElement('div'); actions.className = 'ffe-md5-actions';
    actions.style.cssText = 'margin-top:8px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;';

    const exportLink = document.createElement('a'); exportLink.textContent = 'Export Hashes';
    exportLink.addEventListener('click', () => {
      if (trackedMD5s.size === 0) { statusSpan.textContent = 'Nothing to export.'; statusSpan.style.color = '#cc6666'; return; }
      const text = [...trackedMD5s].join('\n');
      const blob = new Blob([text], { type: 'text/plain' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `ffe-md5-hashes-${trackedMD5s.size}.txt`; a.click(); URL.revokeObjectURL(a.href);
      statusSpan.textContent = `Exported ${trackedMD5s.size} hashes.`; statusSpan.style.color = '#b5bd68';
    });
    actions.appendChild(exportLink);

    const clearLink = document.createElement('a'); clearLink.textContent = 'Clear All';
    clearLink.style.color = '#cc6666';
    clearLink.addEventListener('click', () => {
      if (!confirm('Remove all tracked MD5 hashes?')) return;
      trackedMD5s.clear(); saveTrackedMD5s(); highlightTrackedPosts(); refresh();
      statusSpan.textContent = 'All hashes cleared.'; statusSpan.style.color = '#cc6666';
    });
    actions.appendChild(clearLink);
    mgr.appendChild(actions);

    // Status message
    const statusSpan = document.createElement('div');
    statusSpan.style.cssText = 'margin-top:6px;font-size:11px;color:#888;min-height:14px;';
    mgr.appendChild(statusSpan);

    container.appendChild(mgr);
    refresh();
  }

  function closeSettings() { document.getElementById('ffe-overlay')?.remove(); }

  // ═══════════════════════════════════════════════════════════════════════
  //  HEADER CONTROLS & KEYBOARD
  // ═══════════════════════════════════════════════════════════════════════

  function addSettingsLink() {
    headerControls = document.createElement('div');
    headerControls.className = 'ffe-topbar';

    topbarLeft = document.createElement('div');
    topbarLeft.className = 'ffe-topbar-left';
    headerControls.appendChild(topbarLeft);

    topbarRight = document.createElement('div');
    topbarRight.className = 'ffe-topbar-right';

    // Pin/unpin toggle
    const pinBtn = document.createElement('a');
    pinBtn.appendChild(cfg.headerPinned ? icons.lock('Header pinned') : icons.unlock('Header unpinned'));
    pinBtn.title = cfg.headerPinned ? 'Header pinned (click to unpin)' : 'Header unpinned (click to pin)';
    pinBtn.href = '#';
    pinBtn.addEventListener('click', (e) => {
      e.preventDefault();
      cfg.headerPinned = !cfg.headerPinned;
      saveSettings(cfg);
      pinBtn.innerHTML = '';
      pinBtn.appendChild(cfg.headerPinned ? icons.lock('Header pinned') : icons.unlock('Header unpinned'));
      pinBtn.title = cfg.headerPinned ? 'Header pinned (click to unpin)' : 'Header unpinned (click to pin)';
      applyHeaderPinState();
    });
    topbarRight.appendChild(pinBtn);

    const settingsLink = document.createElement('a');
    settingsLink.appendChild(icons.cog());
    settingsLink.title = "Archive Enhancer Settings";
    settingsLink.href = '#';
    settingsLink.addEventListener('click', (e) => { e.preventDefault(); openSettings(); });
    topbarRight.appendChild(settingsLink);

    headerControls.appendChild(topbarRight);
    document.body.appendChild(headerControls);

    applyHeaderPinState();
  }

  function applyHeaderPinState() {
    if (!headerControls) return;
    if (cfg.headerPinned) {
      headerControls.classList.remove('ffe-header-fading');
    } else {
      headerControls.classList.add('ffe-header-fading');
    }
  }

  function initKeyboardShortcuts() {
    if (!cfg.keyboardNav) return;
    document.addEventListener('keydown', (e) => {
      if (Gallery.handleKey(e)) { e.preventDefault(); e.stopPropagation(); return; }
      const inInput = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
      if (inInput) return;
      const key = e.key.toLowerCase();
      if (key === cfg.settingsKey.toLowerCase()) { e.preventDefault(); document.getElementById('ffe-overlay') ? closeSettings() : openSettings(); return; }
      if (key === cfg.galleryKey.toLowerCase() && !document.getElementById('ffe-overlay')) { e.preventDefault(); Gallery.open(Gallery.findNearestIndex()); return; }
      if (cfg.goonMode && key === cfg.goonKey.toLowerCase()) { e.preventDefault(); GoonMode.toggle(); return; }
      if (cfg.md5Tracking && key === cfg.md5FilterKey.toLowerCase()) { e.preventDefault(); MD5Filter.toggle(); return; }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════════════════════════════

  function bootstrap() {
    const inits = [
      applyFitClasses, applyTextSize, addSettingsLink, initBoardNav,
      initImageExpansion, initImageHoverZoom, initQuotePreview, initBacklinks,
      () => Threading.init(), () => GoonMode.init(), () => MD5Filter.init(),
      initMD5Features, initSavedThreads, () => Gallery.init(),
      initViewOriginalBoard, initCrossArchiveRedirect,
      initFloatingPanel, initIndexCustomization, initKeyboardShortcuts,
    ];
    for (const fn of inits) {
      try { fn(); } catch (e) { console.error('[4AE] Init failed:', fn.name || 'anonymous', e); }
    }

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.('article.thread, article.post')) { cachePost(node); if (cfg.md5Tracking) addMD5MenuButton(node); }
        node.querySelectorAll?.('article.thread, article.post').forEach(a => { cachePost(a); if (cfg.md5Tracking) addMD5MenuButton(a); });
      }
      if (GoonMode.active) { GoonMode.classified = false; GoonMode.classify(); }
      if (MD5Filter.active) { MD5Filter.apply(); }
      if (cfg.md5Tracking) highlightTrackedPosts();
    });
    const target = document.querySelector('.thread, #thread, article.thread') || document.getElementById('main') || document.body;
    observer.observe(target, { childList: true, subtree: true });
  }

  let bootstrapped = false;
  function tryBootstrap() {
    if (bootstrapped) return;
    if (!document.body) return;
    bootstrapped = true;
    bootstrap();
  }

  if (document.readyState !== 'loading') {
    tryBootstrap();
  } else {
    document.addEventListener('DOMContentLoaded', tryBootstrap);
    window.addEventListener('load', tryBootstrap);
    // Polling fallback for AdGuard timing edge cases
    const poll = setInterval(() => { if (document.body) { clearInterval(poll); tryBootstrap(); } }, 50);
    setTimeout(() => clearInterval(poll), 10000);
  }

})();
