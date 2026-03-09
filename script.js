// --- 設定エリア ---
const CLIENT_ID = 'pl16vkiwvra455r0bd35vw1jlxaoe9'; 
const ACCESS_TOKEN = '6gz8vdeee0u7w1yy26zon3ovey18tu'; 

async function updateLiveStatus() {
    const listContainer = document.getElementById('list');
    
    try {
        const resStreamers = await fetch('streamers.json');
        const streamers = await resStreamers.json();
        const ids = streamers.map(s => s.id);

        // 1. ユーザー情報を取得（内部ID: broadcaster_id を得るため）
        const userQuery = ids.map(id => `login=${id}`).join('&');
        const resUsers = await fetch(`https://api.twitch.tv/helix/users?${userQuery}`, {
            headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${ACCESS_TOKEN}` }
        });
        const userData = await resUsers.json();
        const usersInfo = userData.data || [];

        // 2. 配信情報を取得
        const streamQuery = ids.map(id => `user_login=${id}`).join('&');
        const resTwitch = await fetch(`https://api.twitch.tv/helix/streams?${streamQuery}`, {
            headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${ACCESS_TOKEN}` }
        });
        const twitchData = await resTwitch.json();
        const liveStreams = twitchData.data || [];

        // 3. 直近の人気クリップを取得（各ユーザー1件ずつ）
        // ※一度に全員分取れないため、上位5名分などの代表的なものを取得する形にします
        const fullData = await Promise.all(streamers.map(async (s) => {
            const userInfo = usersInfo.find(u => u.login === s.id);
            const liveInfo = liveStreams.find(ls => ls.user_login === s.id);
            
            let topClip = null;
            if (userInfo) {
                // 過去7日間の人気クリップを1件取得
                const clipRes = await fetch(`https://api.twitch.tv/helix/clips?broadcaster_id=${userInfo.id}&first=1`, {
                    headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${ACCESS_TOKEN}` }
                });
                const clipData = await clipRes.json();
                if (clipData.data && clipData.data.length > 0) {
                    topClip = clipData.data[0];
                }
            }

            return {
                displayName: userInfo ? userInfo.display_name : s.name,
                id: s.id,
                live: liveInfo,
                icon: userInfo ? userInfo.profile_image_url : '',
                clip: topClip
            };
        }));

        // 4. 並び替え
        fullData.sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0));

        // 5. HTML生成
        const liveList = fullData.filter(d => d.live);
        const offlineList = fullData.filter(d => !d.live);

        listContainer.innerHTML = `
            <div class="section-title">配信中 (${liveList.length})</div>
            <div class="grid">${liveList.map(d => renderCard(d)).join('') || '<p>配信中のメンバーはいません</p>'}</div>
            <div class="section-title">オフライン</div>
            <div class="grid">${offlineList.map(d => renderCard(d)).join('')}</div>
        `;

    } catch (error) {
        console.error("エラー:", error);
    }
}

function renderCard(d) {
    const isLive = !!d.live;
    return `
        <div class="card ${isLive ? 'live' : ''}">
            <a href="https://twitch.tv/${d.id}" target="_blank" style="text-decoration:none; color:inherit; display:flex;">
                <img src="${d.icon}" class="avatar">
                <div class="info">
                    <div class="name-row">
                        <span class="name">${d.displayName}</span>
                        <span class="label ${isLive ? 'label-live' : 'label-off'}">${isLive ? 'LIVE' : 'OFFLINE'}</span>
                    </div>
                    ${isLive ? `
                        <div class="game">${d.live.game_name}</div>
                        <div class="stream-title">${d.live.title}</div>
                        <div class="viewers">${d.live.viewer_count.toLocaleString()} 人</div>
                    ` : `<div style="color:#555; font-size:0.8em; margin-top:5px;">@${d.id}</div>`}
                </div>
            </a>
            
            ${d.clip ? `
                <div style="margin-top:15px; border-top:1px solid #333; padding-top:10px;">
                    <div style="font-size:0.75em; color:#9146ff; font-weight:bold; margin-bottom:5px;">🔥 人気クリップ</div>
                    <a href="${d.clip.url}" target="_blank" style="text-decoration:none;">
                        <img src="${d.clip.thumbnail_url}" style="width:100%; border-radius:4px; margin-bottom:5px;">
                        <div style="font-size:0.75em; color:#efeff1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${d.clip.title}
                        </div>
                    </a>
                </div>
            ` : ''}
        </div>
    `;
}

updateLiveStatus();
setInterval(updateLiveStatus, 5 * 60 * 1000);