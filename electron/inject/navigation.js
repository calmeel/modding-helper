// 上部タブ、説明書・言語リンク、リアルタイム表示ボタンを担当する。
function setupElectronNavigation({ topLinks, text: electronText, selectView, refreshView, refreshTitles, onLanguageChanged }) {
  var svgBook = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
  /* ⚙設定 ボタンで設定モードを切替 */
  var settingsToggleBtn = document.getElementById('toggleTabSettings');
  if (settingsToggleBtn) {
    settingsToggleBtn.addEventListener('click', function() {
      selectView('settings');
    });
  }

  /* ── .top-links の子要素を #etb-nav に移動 ── */
  try {
    var navEl = document.getElementById('etb-nav');
    if (topLinks && navEl) {
      var tlRow = topLinks.querySelector('.top-links-row');
      var langSwitch = topLinks.querySelector('.language-switch');
      if (tlRow) {
        var otherToolsA = tlRow.querySelector('a:not(#manualLink)');
        if (otherToolsA) otherToolsA.id = 'etb-other-tools';
        Array.from(tlRow.children).forEach(function(child) { navEl.appendChild(child); });
      }
      if (langSwitch) {
        var languageEl = document.getElementById('etb-language');
        ['langEn', 'langJa'].forEach(function(id) {
          var button = langSwitch.querySelector('#' + id);
          if (button) languageEl.appendChild(button);
        });
      }
      topLinks.remove();

      /* exe では外部リンク系（他のツールを見る / 更新履歴）は出さない。
         タイトルバーの幅を食い、ウィンドウを狭めた時にウィンドウ操作ボタンを
         押し出してしまうため。web ツール側には残っている。 */
      ['etb-other-tools', 'updateBtn'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.remove();
      });

      /* 絵文字を除去しつつ SVG アイコンを先頭に設定（innerHTML で再構築） */
      var updateNavItem = function(el, svg) {
        if (!el) return;
        var text = el.textContent.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/^\s+/, '');
        el.innerHTML = svg + text;
      };

      /* 説明書リンクを GitHub Pages URL に向ける */
      var manualLink = document.getElementById('manualLink');
      var updateDocsUrl = function() {
        if (!manualLink) return;
        var isEn = document.getElementById('langEn') && document.getElementById('langEn').classList.contains('active');
        manualLink.href = isEn
          ? 'https://calmeel.github.io/modding-helper/docs/docs-en.html'
          : 'https://calmeel.github.io/modding-helper/docs/docs.html';
      };
      updateDocsUrl();

      /* アイコン付きボタンを初期設定し、言語切替時も MutationObserver で即時再描画 */
      [
        { id: 'manualLink', svg: svgBook },
      ].forEach(function(item) {
        var el = document.getElementById(item.id);
        if (!el) return;
        updateNavItem(el, item.svg);
        (function(element, iconSvg) {
          var obs = new MutationObserver(function() {
            obs.disconnect();
            updateNavItem(element, iconSvg);
            obs.observe(element, { childList: true, characterData: true, subtree: true });
          });
          obs.observe(element, { childList: true, characterData: true, subtree: true });
        })(el, item.svg);
      });

      /* langEn の class 変化（active 付与）を監視して docs URL・待機テキストを即時更新 */
      var langEnBtn = document.getElementById('langEn');
      if (langEnBtn) {
        new MutationObserver(function() {
          updateDocsUrl();
          onLanguageChanged();
        }).observe(langEnBtn, { attributes: true, attributeFilter: ['class'] });
      }

      /* 設定ボタンのテキスト（歯車は付けない） */
      var settingsBtn = document.getElementById('toggleTabSettings');
      if (settingsBtn) settingsBtn.textContent = electronText('electronSettings');

      /* 表示切替タブを設定の前に追加する。 */
      if (settingsBtn && settingsBtn.parentNode && !document.getElementById('etb-tab-main')) {
        var mainTabBtn = document.createElement('button');
        mainTabBtn.id = 'etb-tab-main';
        mainTabBtn.type = 'button';
        mainTabBtn.textContent = electronText('electronCheck');
        settingsBtn.parentNode.insertBefore(mainTabBtn, settingsBtn);
        mainTabBtn.addEventListener('click', function() {
          selectView('main');
        });

        var previewTabBtn = document.createElement('button');
        previewTabBtn.id = 'etb-tab-preview';
        previewTabBtn.type = 'button';
        previewTabBtn.textContent = electronText('electronPreview');
        settingsBtn.parentNode.insertBefore(previewTabBtn, settingsBtn);
        previewTabBtn.addEventListener('click', function() {
          selectView('preview');
        });

        var notepadTabBtn = document.createElement('button');
        notepadTabBtn.id = 'etb-tab-notepad';
        notepadTabBtn.type = 'button';
        notepadTabBtn.textContent = electronText('electronNotepad');
        settingsBtn.parentNode.insertBefore(notepadTabBtn, settingsBtn);
        notepadTabBtn.addEventListener('click', function() {
          selectView('notepad');
        });
        /* リアルタイム表示は画面を切り替えず、既存の分離窓を開く。 */
        var realtimeTabBtn = document.createElement('button');
        realtimeTabBtn.id = 'etb-tab-realtime';
        realtimeTabBtn.type = 'button';
        realtimeTabBtn.setAttribute('aria-expanded', 'false');
        realtimeTabBtn.textContent = electronText('electronRealtime');
        settingsBtn.parentNode.insertBefore(realtimeTabBtn, settingsBtn);
        var setRealtimeWindowOpen = function(open) {
          realtimeTabBtn.classList.toggle('active', open);
          realtimeTabBtn.setAttribute('aria-expanded', String(open));
        };
        if (window.electronAPI && window.electronAPI.onPanelOpened) {
          window.electronAPI.onPanelOpened(function(panel) {
            if (panel === 'timing') setRealtimeWindowOpen(true);
          });
        }
        if (window.electronAPI && window.electronAPI.onPanelRedocked) {
          window.electronAPI.onPanelRedocked(function(panel) {
            if (panel === 'timing') setRealtimeWindowOpen(false);
          });
        }
        realtimeTabBtn.addEventListener('click', function() {
          if (window.electronAPI && window.electronAPI.detachPanel) {
            var lang = document.documentElement.lang === 'en' ? 'en' : 'ja';
            window.electronAPI.detachPanel('timing', lang);
          }
        });
        refreshView(); // 追加直後に active 表示を反映
      }
      refreshTitles();

      /* ナビの並び順を指定どおりに整える:
         チェック/プレビュー/メモ帳/リアルタイム表示/設定
         説明書・言語切替は右上のウィンドウ操作ボタンの手前に配置する。
         （appendChild は既存要素を移動するので、望む順に付け直すだけで並び替わる） */
      [
        document.getElementById('etb-tab-main'),      // チェック
        document.getElementById('etb-tab-preview'),   // プレビュー
        document.getElementById('etb-tab-notepad'),   // メモ帳
        document.getElementById('etb-tab-realtime'), // リアルタイム表示（別ウィンドウ）
        document.getElementById('toggleTabSettings')  // 設定
      ].forEach(function(el) { if (el) navEl.appendChild(el); });
      var rightLinks = document.getElementById('etb-language');
      if (manualLink && rightLinks) {
        rightLinks.insertBefore(manualLink, rightLinks.firstChild);
      }
    }
  } catch(e) { /* ナビゲーション処理が失敗してもウィンドウ操作は継続 */ }

}
