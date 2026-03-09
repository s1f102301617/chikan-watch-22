// --- 設定エリア ---
const CLIENT_ID = 'pl16vkiwvra455r0bd35vw1jlxaoe9'; 
const ACCESS_TOKEN = '6gz8vdeee0u7w1yy26zon3ovey18tu'; 

async function updateLiveStatus() {
    const listContainer = document.getElementById('list');
    
    try {
        // 1. 配信者リストを読み込む
        const resStreamers = await fetch('streamers.json');
        const streamers = await resStreamers.json();
        const ids = streamers.map(s => s.id);

        // 2. Twitch APIから配信情報を取得
        const query = ids.map(id => `user_login=${id}`).join('&');
        const resTwitch = await fetch(`https://api.twitch.tv/helix/streams?${query}`, {
            headers: {
                'Client-ID': CLIENT_ID,
                'Authorization': `Bearer ${ACCESS_TOKEN}`
            }
        });
        const twitchData = await resTwitch.json();
        const liveStreams = twitchData.data || [];

        // 3. ユーザー情報（アイコンURL）を取得
        const userQuery = ids.map(id => `login=${id}`).join('&');
        const resUsers = await fetch(`https://api.twitch.tv/helix/users?${userQuery}`, {
            headers: {
                'Client-ID': CLIENT_ID,
                'Authorization': `Bearer ${ACCESS_TOKEN}`
            }
        });
        const userData = await resUsers.json();
        const usersInfo = userData.data || [];

        // 4. データを統合
        const fullData = streamers.map(s => {
            const liveInfo = liveStreams.find(ls => ls.user_login === s.id);
            const userInfo = usersInfo.find(u => u.login === s.id);
            return {
                ...s,
                live: liveInfo,
                icon: userInfo ? userInfo.profile_image_url : 'https://static-cdn.jtvnw.net/user-default-pictures-uv/ce559792-4299-4613-8405-5ad239604461-profile_image-70x70.png'
            };
        });

        // 5. 並び替え（配信中を上、オフラインを下）
        fullData.sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0));

        // 6. HTMLの生成と流し込み
        const liveList = fullData.filter(d => d.live);
        const offlineList = fullData.filter(d => !d.live);

        listContainer.innerHTML = `
            <div class="section-title">配信中 (${liveList.length})</div>
            <div class="grid">
                ${liveList.length > 0 ? liveList.map(d => renderCard(d)).join('') : '<p style="padding-left:20px; color:#888;">現在配信中のメンバーはいません</p>'}
            </div>
            
            <div class="section-title">オフライン</div>
            <div class="grid">
                ${offlineList.map(d => renderCard(d)).join('')}
            </div>
        `;

    } catch (error) {
        console.error("エラーが発生しました:", error);
        listContainer.innerHTML = `<p style="text-align:center; color:red;">データの取得に失敗しました。トークンの期限切れか、APIの設定を確認してください。</p>`;
    }
}

// カードの見た目を作る補助関数
function renderCard(d) {
    const isLive = !!d.live;
    return `
        <a href="https://twitch.tv/${d.id}" target="_blank" class="card ${isLive ? 'live' : ''}">
            <img src="${d.icon}" class="avatar" alt="${d.name}">
            <div class="info">
                <div class="name-row">
                    <span class="name">${d.name}</span>
                    <span class="label ${isLive ? 'label-live' : 'label-off'}">${isLive ? 'LIVE' : 'OFFLINE'}</span>
                </div>
                ${isLive ? `
                    <div class="game">${d.live.game_name}</div>
                    <div class="stream-title">${d.live.title}</div>
                    <div class="viewers">${d.live.viewer_count.toLocaleString()} 人</div>
                ` : `
                    <div style="color:#555; font-size:0.8em; margin-top:5px;">@${d.id}</div>
                `}
            </div>
        </a>
    `;
}

// 実行
updateLiveStatus();
// 5分ごとに自動更新
setInterval(updateLiveStatus, 5 * 60 * 1000);