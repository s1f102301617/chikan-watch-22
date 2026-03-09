// --- 設定エリア ---
const CLIENT_ID = 'pl16vkiwvra455r0bd35vw1jlxaoe9'; 
const ACCESS_TOKEN = '6gz8vdeee0u7w1yy26zon3ovey18tu'; 

async function updateLiveStatus() {
    const listContainer = document.getElementById('list');
    
    try {
        // 1. 配信者リストを読み込む
        const resStreamers = await fetch('streamers.json');
        const streamers = await resStreamers.json();

        // 2. Twitch APIに問い合わせる
        const query = streamers.map(s => `user_login=${s.id}`).join('&');
        const resTwitch = await fetch(`https://api.twitch.tv/helix/streams?${query}`, {
            headers: {
                'Client-ID': CLIENT_ID,
                'Authorization': `Bearer ${ACCESS_TOKEN}`
            }
        });
        
        const twitchData = await resTwitch.json();
        const liveStreams = twitchData.data || [];

        // 3. 画面にカードを表示する
        listContainer.innerHTML = streamers.map(s => {
            const liveInfo = liveStreams.find(ls => ls.user_login === s.id);
            const isLive = !!liveInfo;

            return `
                <a href="https://twitch.tv/${s.id}" target="_blank" class="card ${isLive ? 'live' : ''}">
                    <div style="font-size: 1.2em; font-weight: bold;">${s.name}</div>
                    <div style="font-size: 0.8em; color: #888; margin-bottom: 5px;">@${s.id}</div>
                    ${isLive ? `
                        <div class="label label-live">LIVE</div>
                        <div style="font-size: 0.8em; margin-top: 5px; color: #ff4b4b; font-weight: bold;">
                            視聴者: ${liveInfo.viewer_count.toLocaleString()}人
                        </div>
                        <div style="font-size: 0.7em; margin-top: 3px; color: #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${liveInfo.title}
                        </div>
                    ` : `
                        <div class="label label-off">OFFLINE</div>
                    `}
                </a>
            `;
        }).join('');

    } catch (error) {
        console.error("エラー:", error);
        listContainer.innerHTML = "データの取得に失敗しました。トークンの期限切れかもしれません。";
    }
}

// 実行
updateLiveStatus();
// 5分ごとに自動更新
setInterval(updateLiveStatus, 5 * 60 * 1000);