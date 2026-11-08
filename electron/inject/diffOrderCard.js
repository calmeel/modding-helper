// ElectronのDiff順カード。既存の操作要素を移動してイベントを保持する。
function createElectronDiffOrderCard(electronText) {
  /* Diff順は同じ操作要素を移し、既存のイベント・状態を保持する。 */
  var orderPanel = document.getElementById('spread-subtab-order');
  var orderHome = orderPanel && orderPanel.parentElement;
  var orderNext = orderPanel && orderPanel.nextSibling;
  var orderCard = document.createElement('div');
  orderCard.id = 'etb-card-difforder';
  orderCard.className = 'etb-card';
  orderCard.innerHTML = '<div class="etb-card-head"><span class="etb-card-title" data-i18n="spreadDiffOrder">' +
    electronText('spreadDiffOrder') + '</span></div><div class="etb-card-body"></div>';
  var orderBody = orderCard.querySelector('.etb-card-body');
  var orderHead = orderCard.querySelector('.etb-card-head');
  var orderReset = document.getElementById('spreadResetOrderButton');
  var orderActions = orderPanel && orderPanel.querySelector('.spread-order-actions');
  if (orderReset) {
    orderReset.removeAttribute('data-i18n');
    orderReset.setAttribute('data-i18n-title', 'spreadAutoOrder');
    orderReset.title = electronText('spreadAutoOrder');
    orderReset.innerHTML = '<svg class="etb-order-reset-icon" aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M20 4v6h-6M4 20v-6h6"/><path d="M4.8 9a8 8 0 0 1 13.1-3.1L20 10M4 14l2.1 4.1A8 8 0 0 0 19.2 15"/></svg>' +
      '<span data-i18n="spreadAutoOrder">' + electronText('spreadAutoOrder') + '</span>';
  }

  /* Electronだけ表形式にする。ブラウザ用フォーマッターは変更しない。 */
  window.formatSpreadDiffOrderTable = function(results, t, diffOrder, manualCategories) {
    if (!results.length) return t('noOsuFiles');
    var sorted = diffOrder ? applySpreadDiffOrder(results, diffOrder) : sortSpreadResults(results);
    var rows = sorted.map(function(result, index) {
      var file = escapeHtml(result.fileName);
      var name = escapeHtml(getDifficultyNameText(result.fileName));
      var category = getSpreadEffectiveCategory(result, manualCategories || {});
      return '<tr><td>' + (index + 1) + '</td><td class="etb-order-move">' +
        '<button type="button" class="spread-order-button" data-spread-order-action="up" data-file-name="' + file + '"' +
          (index === 0 ? ' disabled' : '') + ' aria-label="Move up">↑</button>' +
        '<button type="button" class="spread-order-button" data-spread-order-action="down" data-file-name="' + file + '"' +
          (index === sorted.length - 1 ? ' disabled' : '') + ' aria-label="Move down">↓</button>' +
        '</td><td class="etb-order-name"><span class="diff-name">' + name + '</span></td><td>' +
        formatSpreadCategorySelect(result.fileName, category) + '</td></tr>';
    }).join('');
    return '<table class="etb-order-table"><colgroup><col class="etb-order-number-col"><col class="etb-order-move-col">' +
      '<col><col class="etb-order-category-col"></colgroup><thead><tr>' +
      '<th scope="col">#</th><th scope="col">Move</th><th scope="col">Diff</th><th scope="col">Category</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';
  };

  function setCompact(compact) {
    if (orderPanel && orderHome) {
      if (compact) {
        if (orderPanel.parentElement !== orderHome) orderHome.insertBefore(orderPanel, orderNext);
        if (orderReset && orderActions) {
          orderReset.classList.remove('etb-map-action');
          orderReset.classList.add('doc-btn');
          orderActions.appendChild(orderReset);
        }
      } else {
        if (orderPanel.parentElement !== orderBody) orderBody.appendChild(orderPanel);
        if (orderReset) {
          orderReset.classList.remove('doc-btn');
          orderReset.classList.add('etb-map-action');
          orderHead.appendChild(orderReset);
        }
        var orderTab = document.querySelector('.spread-subtab-button[data-spread-subtab="order"]');
        if (orderTab && orderTab.classList.contains('active')) {
          var nextTab = document.querySelector('.spread-subtab-button[data-spread-subtab="odhp"]');
          if (nextTab) nextTab.click();
        }
        var orderEntry = document.querySelector('.tab-button[data-spread-subtab-target="order"]');
        if (orderEntry && orderEntry.classList.contains('active')) {
          var nextEntry = document.querySelector('.tab-button[data-spread-subtab-target="odhp"]');
          if (nextEntry) nextEntry.click();
        }
      }
    }
  }
  return { element: orderCard, setCompact };
}
