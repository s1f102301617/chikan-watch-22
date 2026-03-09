const CLIENT_ID = 'pl16vkiwvra455r0bd35vw1jlxaoe9'; 
const ACCESS_TOKEN = '6gz8vdeee0u7w1yy26zon3ovey18tu'; 

async function updateLiveStatus() {
    const listContainer = document.getElementById('list');
    
    try {
        const resStreamers = await fetch('streamers.json');
        const streamers = await resStreamers.json();
        const ids = streamers.map(s => s.id);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const startedAt = sevenDaysAgo.toISOString();

        // 1. ユーザー情報（アイコン・総再生数）
        const userQuery = ids.map(id => `login=${id}`).join('&');
        const resUsers = await fetch(`https://api.twitch.tv/helix/users?${userQuery}`, {
            headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${ACCESS_TOKEN}` }
        });
        const userData = await resUsers.json();
        const usersInfo = userData.data || [];

        // 2. 配信情報（視聴者数・サムネ）
        const streamQuery = ids.map(id => `user_login=${id}`).join('&');
        const resTwitch = await fetch(`https://api.twitch.tv/helix/streams?${streamQuery}`, {
            headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${ACCESS_TOKEN}` }
        });
        const twitchData = await resTwitch.json();
        const liveStreams = twitchData.data || [];

        // 3. 各自のデータを統合・クリップ取得
        const fullData = await Promise.all(streamers.map(async (s) => {
            const userInfo = usersInfo.find(u => u.login === s.id);
            const liveInfo = liveStreams.find(ls => ls.user_login === s.id);
            
            let topClip = null;
            if (userInfo) {
                const clipRes = await fetch(`https://api.twitch.tv/helix/clips?broadcaster_id=${userInfo.id}&started_at=${startedAt}&first=1`, {
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
                clip: topClip,
                // オフライン時の並び替え指標（総再生数）
                viewCount: userInfo ? parseInt(userInfo.view_count) : 0
            };
        }));

        // 4. 並び替え：配信中は同接順、オフラインは再生数順
        const liveList = fullData.filter(d => d.live).sort((a, b) => b.live.viewer_count - a.live.viewer_count);
        const offlineList = fullData.filter(d => !d.live).sort((a, b) => b.viewCount - a.viewCount);

        listContainer.innerHTML = `
            <div class="section-title">配信中 (${liveList.length})</div>
            <div class="grid">${liveList.map(d => renderCard(d)).join('') || '<p style="padding:20px; color:#888;">現在配信中のメンバーはいません</p>'}</div>
            
            <div class="section-title">オフライン</div>
            <div class="grid">${offlineList.map(d => renderCard(d)).join('')}</div>
        `;

    } catch (error) {
        console.error("エラー:", error);
    }
}

function renderCard(d) {
    const isLive = !!d.live;
    let thumbUrl = "";
    if (isLive) {
        thumbUrl = d.live.thumbnail_url.replace('{width}', '400').replace('{height}', '225');
    }

    return `
        <div class="card ${isLive ? 'live' : ''}">
            <a href="https://twitch.tv/${d.id}" target="_blank" class="streamer-link">
                <img src="${d.icon}" class="avatar">
                <div class="info">
                    <div class="name-row">
                        <span class="name">${d.displayName}</span>
                        <span class="label ${isLive ? 'label-live' : 'label-off'}">${isLive ? 'LIVE' : 'OFFLINE'}</span>
                    </div>
                    ${isLive ? `<div class="game">${d.live.game_name}</div>` : `<div style="color:#555; font-size:0.8em;">@${d.id}</div>`}
                </div>
            </a>

            ${isLive ? `
                <a href="https://twitch.tv/${d.id}" target="_blank" style="text-decoration:none; color:inherit;">
                    <img src="${thumbUrl}" class="live-thumb">
                    <div class="stream-title">${d.live.title}</div>
                    <div class="viewers">● ${d.live.viewer_count.toLocaleString()} 人</div>
                </a>
            ` : `<div class="stats">総再生数: ${d.viewCount.toLocaleString()}</div>`}
            
            ${d.clip ? `
                <div class="clip-section">
                    <span class="clip-label">🔥 直近7日間の人気クリップ</span>
                    <a href="${d.clip.url}" target="_blank" class="clip-link">
                        <div class="clip-thumb-img" style="background-image: url('${d.clip.thumbnail_url}');"></div>
                        <div class="clip-title">${d.clip.title}</div>
                    </a>
                </div>
            ` : ''}
        </div>
    `;
}

updateLiveStatus();
setInterval(updateLiveStatus, 5 * 60 * 1000);