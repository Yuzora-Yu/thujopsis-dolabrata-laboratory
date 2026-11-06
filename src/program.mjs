export const programPath='/research/lunar-habitat/';
export const programTitle='月面居住技術プログラム';

// Public exhibition labels. This is a schematic of the test, not a floor plan.
export function programOverview(){
 return `<section class="lunar-overview" aria-labelledby="lunar-overview-title"><div class="wrap lunar-overview-grid"><div><p class="eyebrow">A72 / GROUND HABITAT TEST</p><h2 id="lunar-overview-title">補給が来ない。<br>それでも、朝は来る。</h2></div><div><p>月面では、壊れた部品をすぐに取り寄せることはできません。水を回し、通信を引き継ぎ、必要な道具をその場で作る。あすなろでは、その一つひとつをつないで、暮らしが続くかを地上で確かめます。</p><a class="text-link" href="${programPath}">月面居住技術プログラム</a></div></div></section>`;
}

export function programBody(){
 return `<article class="wrap article lunar-program">
 <figure class="lunar-concept"><img src="/assets/media/lunar-habitat-concept.webp" alt="月面の平原に三つの居住モジュールをつないだ構想図。窓に暖色の灯りがともっている。" width="1817" height="866" decoding="async"><figcaption>月面居住区 構想図</figcaption></figure>
 <div class="lunar-intro"><p class="eyebrow">A72 / 地上統合実証</p><h2>補給便が遅れた朝、<br>最初に何をしますか。</h2><p>次の便に積んだ部品を待つあいだも、水を使い、食事を作り、翌朝の班に仕事を渡します。A72は、補給を受けられない72時間を想定した地上実証です。水の循環、現地での部品製作、作業記録の引き継ぎを、一つの居住環境で確かめます。</p></div>
 <section class="lunar-demonstrator" aria-labelledby="demo-heading" data-habitat-demo data-mode="normal"><header><div><p class="eyebrow">A72 / SYSTEM EXHIBIT</p><h2 id="demo-heading">補給が止まったら</h2></div><div class="lunar-mode" role="group" aria-label="設備展示の運用状態"><button type="button" data-habitat-mode="normal" aria-pressed="true">通常</button><button type="button" data-habitat-mode="isolated" aria-pressed="false">補給停止</button></div></header>
 <svg class="lunar-system-diagram" viewBox="0 0 860 220" role="img" aria-label="三つの居住モジュールを結ぶ設備の概略図">
 <defs><pattern id="lunar-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#55736a" stroke-opacity=".25"/></pattern></defs>
 <rect x="1" y="1" width="858" height="218" fill="url(#lunar-grid)" stroke="#55736a"/>
 <g fill="#193431" stroke="#a9bdb0" stroke-width="2"><rect x="107" y="61" width="192" height="94" rx="39"/><rect x="334" y="61" width="192" height="94" rx="39"/><rect x="561" y="61" width="192" height="94" rx="39"/><path d="M299 95h35v26h-35zm227 0h35v26h-35z"/></g>
 <g fill="none" stroke="#97ada0" stroke-width="2" opacity=".55"><path d="M135 73v69m137-69v69M362 73v69m137-69v69M589 73v69m137-69v69"/></g>
 <path class="lunar-feed-external" d="M28 108h79m646 0h79" fill="none" stroke-width="4" stroke-linecap="round"/>
 <path class="lunar-feed-core" d="M107 108h646" fill="none" stroke-width="4" stroke-linecap="round"/>
 <path class="lunar-feed-backup" d="M203 108v76h454v-76m-227 76v-76" fill="none" stroke-width="4" stroke-linejoin="round"/>
 <g fill="#e4e9d6" font-family="monospace" font-size="14" letter-spacing="2" text-anchor="middle"><text x="203" y="50">01 / WATER</text><text x="430" y="50">02 / RECORD</text><text x="657" y="50">03 / WORKSHOP</text></g>
 </svg>
 <div class="lunar-system" aria-label="居住モジュールの設備構成">
 <div><span class="system-code">01 / WATER</span><h3>水を戻す</h3><p data-system-status="water">通常の循環経路</p></div>
 <div><span class="system-code">02 / RECORD</span><h3>記録を残す</h3><p data-system-status="record">地上側の控えと照合</p></div>
 <div><span class="system-code">03 / WORKSHOP</span><h3>現地で直す</h3><p data-system-status="workshop">補用品を受領</p></div>
 </div><p class="lunar-system-note" data-habitat-note aria-live="polite">補給便から交換部品を受け取り、通常の系統で運用します。</p></section>
 <section class="lunar-section" id="handover"><h2>次の班が、仕事を始めるまで</h2><p>引き継ぎでは、前の班から口頭で説明を受けず、居住区に残された控えを使います。どの弁を開けたか、どの道具を移したか。次の班がその記録を受け取り、食事や仕事を再開できた時刻までを確かめます。</p>
 <figure class="lunar-handover-slip">
 <figcaption><span>A72 / 交代用控え</span><span>展示用見本</span></figcaption>
 <dl><div><dt>使える水の系統</dt><dd>予備系統。通常系統は点検中。</dd></div><div><dt>移動した道具</dt><dd>洗いかごと清掃済みの器具は、洗い場右手の棚の上から二段目。</dd></div></dl>
 </figure>
 <div class="lunar-reading"><div><p>朝の交代で、二つの時刻を記録しました。</p><a class="text-link" href="/news/20261027/">装置が直った時刻、暮らしが戻った時刻</a></div><div><p>片方の枝を閉じても、水が試験槽へ戻るかを確かめました。</p><a class="text-link" href="/news/20250509/">循環設備の切替試験</a></div></div></section>
 <section class="lunar-section"><h2>地上で試せることから</h2><p>地上実証では、外部補給と通信の一部を試験用の系統で再現しております。月面の重力や真空を再現する設備ではございません。公開展示では、4階で試験設備の構成と、個別の技術をご紹介しております。</p><div class="button-row"><a class="button dark" href="/news/20261020/">公開展示のご案内</a><a class="text-link" href="/facilities/">施設・サービス</a></div></section>
 </article>`;
}
