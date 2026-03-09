const CLIENT_ID = 'pl16vkiwvra455r0bd35vw1jlxaoe9'; 
const ACCESS_TOKEN = '6gz8vdeee0u7w1yy26zon3ovey18tu'; // 定期的に更新が必要

async function updateLiveStatus() {
    const listContainer = document.getElementById('list');
    try {
        const resStreamers = await fetch('streamers.json');
        const streamers = await resStreamers.json();
        const ids = streamers.map(s => s.id);
        const startedAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

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
                const cData = await clipRes.json();
                if (cData.data && cData.data.length > 0) clip = cData.data[0];
            }
            return { ...s, u, live, clip, viewCount: u ? parseInt(u.view_count) : 0 };
        }));

        const liveList = fullData.filter(d => d.live).sort((a, b) => b.live.viewer_count - a.live.viewer_count);
        const offlineList = fullData.filter(d => !d.live).sort((a, b) => b.viewCount - a.viewCount);

        listContainer.innerHTML = `
            <div class="section-title">Online</div>
            <div class="list-area">${liveList.map(d => renderRow(d)).join('')}</div>
            <div class="section-title">Offline</div>
            <div class="list-area">${offlineList.map(d => renderRow(d)).join('')}</div>
        `;
    } catch (e) { console.error(e); }
}

function renderRow(d) {
    const isLive = !!d.live;
    const name = d.u ? d.u.display_name : d.name;
    const icon = d.u ? d.u.profile_image_url : '';

    return `
        <a href="https://twitch.tv/${d.id}" target="_blank" class="item">
            ${isLive ? `
                <div class="thumb-area">
                    <img src="${d.live.thumbnail_url.replace('{width}','320').replace('{height}','180')}" class="live-img">
                </div>
            ` : ''}

            <div class="avatar-area">
                <img src="${icon}" class="avatar">
            </div>

            <div class="info-area">
                <div class="name-row">
                    <span class="name">${name}</span>
                </div>
                ${isLive ? `
                    <span class="stream-title">${d.live.title}</span>
                    <div class="meta-info">ゲーム: ${d.live.game_name}</div>
                ` : `
                    <div class="meta-info">オフライン (再生数: ${d.viewCount.toLocaleString()})</div>
                `}
                
                ${d.clip ? `
                    <div class="clip-row">
                        <img src="${d.clip.thumbnail_url}" class="clip-thumb">
                        <div class="clip-info">🔥 最近の人気クリップ: ${d.clip.title}</div>
                    </div>
                ` : ''}
            </div>

            <div class="count-area">
                ${isLive ? `<div class="viewer-num">${d.live.viewer_count.toLocaleString()}</div>` : ''}
            </div>
        </a>
    `;
}

updateLiveStatus();
setInterval(updateLiveStatus, 5 * 60 * 1000);