const CLIENT_ID = 'pl16vkiwvra455r0bd35vw1jlxaoe9'; 
const ACCESS_TOKEN = '6gz8vdeee0u7w1yy26zon3ovey18tu'; 

async function updateLiveStatus() {
    const listContainer = document.getElementById('list');
    
    try {
        const resStreamers = await fetch('streamers.json');
        const streamers = await resStreamers.json();
        const ids = streamers.map(s => s.id);

        // 1. 配信情報を取得 (Streams API)
        const query = ids.map(id => `user_login=${id}`).join('&');
        const resTwitch = await fetch(`https://api.twitch.tv/helix/streams?${query}`, {
            headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${ACCESS_TOKEN}` }
        });
        const twitchData = await resTwitch.json();
        const liveStreams = twitchData.data || [];

        // 2. ユーザー情報（アイコンURL）を取得 (Users API)
        const userQuery = ids.map(id => `login=${id}`).join('&');
        const resUsers = await fetch(`https://api.twitch.tv/helix/users?${userQuery}`, {
            headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${ACCESS_TOKEN}` }
        });
        const userData = await resUsers.json();
        const usersInfo = userData.data || [];

        // 3. データを合体させる
        const fullData = streamers.map(s => {
            const liveInfo = liveStreams.find(ls => ls.user_login === s.id);
            const userInfo = usersInfo.find(u => u.login === s.id);
            return { ...s, live: liveInfo, icon: userInfo ? userInfo.profile_image_url : '' };
        });

        // 4. 「配信中」を上に、「オフライン」を下に並び替える
        fullData.sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0));

        // 5. HTML生成
        listContainer.innerHTML = `
            <div class="section-title">配信中</div>
            <div class="grid">${fullData.filter(d => d.live).map(d => renderCard(d)).join('') || '<p>配信中のメンバーはいません</p>'}</div>
            <div class="section-title">オフライン</div>
            <div class="grid">${fullData.filter(d => !d.live).map(d => renderCard(d)).join('')}</div>
        `;

    } catch (error) {
        console.error("エラー:", error);
    }
}

function renderCard(d) {
    const isLive = !!d.live;
    return `
        <a href="https://twitch.tv/${d.id}" target="_blank" class="card ${isLive ? 'live' : ''}">
            <img src="${d.icon}" class="avatar">
            <div class="info">
                <div class="name">
                    ${d.name}
                    <span class="label ${isLive ? 'label-live' : 'label-off'}">${isLive ? 'LIVE' : 'OFFLINE'}</span>
                </div>
                <div class="game">${isLive ? d.live.game_name : '@' + d.id}</div>
                ${isLive ? `
                    <div class="title">${d.live.title}</div>
                    <div class="viewers">${d.live.viewer_count.toLocaleString()} 人が視聴中</div>
                ` : ''}
            </div>
        </a>
    `;
}

updateLiveStatus();
setInterval(updateLiveStatus, 5 * 60 * 1000);