// 【メンテナンス用】トークンが切れたら以下のURLをブラウザで叩いて新しく取得し、ACCESS_TOKEN を書き換える
// https://id.twitch.tv/oauth2/authorize?client_id=pl16vkiwvra455r0bd35vw1jlxaoe9&redirect_uri=http://localhost&response_type=token&scope=
// 取得した access_token= の後ろの英数字を下の変数値に貼り付ける

// ...以下、元のコードが続く

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

        const userRes = await fetch(`https://api.twitch.tv/helix/users?${ids.map(id => `login=${id}`).join('&')}`, {
            headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${ACCESS_TOKEN}` }
        });
        const users = (await userRes.json()).data || [];

        const streamRes = await fetch(`https://api.twitch.tv/helix/streams?${ids.map(id => `user_login=${id}`).join('&')}`, {
            headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${ACCESS_TOKEN}` }
        });
        const liveStreams = (await streamRes.json()).data || [];

        const fullData = await Promise.all(streamers.map(async (s) => {
            const u = users.find(user => user.login === s.id);
            const live = liveStreams.find(ls => ls.user_login === s.id);
            let clip = null;
            if (u) {
                const clipRes = await fetch(`https://api.twitch.tv/helix/clips?broadcaster_id=${u.id}&started_at=${startedAt}&first=1`, {
                    headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${ACCESS_TOKEN}` }
                });
                const clipData = await clipRes.json();
                if (clipData.data && clipData.data.length > 0) clip = clipData.data[0];
            }
            return { ...s, u, live, clip, viewCount: u ? parseInt(u.view_count) : 0 };
        }));

        const liveList = fullData.filter(d => d.live).sort((a, b) => b.live.viewer_count - a.live.viewer_count);
        const offlineList = fullData.filter(d => !d.live).sort((a, b) => b.viewCount - a.viewCount);

        listContainer.innerHTML = `
            <div class="section-title">Online</div>
            <div class="stream-list">${liveList.map(d => renderRow(d)).join('') || '<p style="padding:10px;color:#555;">No one is live</p>'}</div>
            <div class="section-title">Offline</div>
            <div class="stream-list">${offlineList.map(d => renderRow(d)).join('')}</div>
        `;

    } catch (e) { console.error(e); }
}

function renderRow(d) {
    const isLive = !!d.live;
    const name = d.u ? d.u.display_name : d.name;
    const icon = d.u ? d.u.profile_image_url : '';

    return `
        <a href="https://twitch.tv/${d.id}" target="_blank" class="item">
            <div class="user-area">
                <img src="${icon}" class="avatar">
                <span class="name">${name}</span>
            </div>
            <div class="content-area">
                ${isLive ? `
                    <span class="game-name">${d.live.game_name}</span>
                    <span class="stream-title">${d.live.title}</span>
                ` : `
                    <span class="stream-title" style="color:#555;">@${d.id}</span>
                `}
            </div>
            <div class="stats-area">
                ${isLive ? `
                    <span class="viewers">${d.live.viewer_count.toLocaleString()}</span>
                    <img src="${d.live.thumbnail_url.replace('{width}','160').replace('{height}','90')}" class="live-thumb">
                ` : `
                    <span class="label-off">OFFLINE</span>
                `}
                ${d.clip ? `<img src="${d.clip.thumbnail_url}" class="clip-thumb" title="Recent Clip: ${d.clip.title}">` : ''}
            </div>
        </a>
    `;
}

updateLiveStatus();
setInterval(updateLiveStatus, 5 * 60 * 1000);