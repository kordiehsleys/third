document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loading-screen');
    const setupScreen = document.getElementById('setup-screen');
    const lockScreen = document.getElementById('lock-screen');
    const homeScreen = document.getElementById('home-screen');
    const unlockOverlay = document.getElementById('unlock-overlay');
    const loadingBar = document.querySelector('.loading-bar');

    // 1. 安全的数据加载函数
    function safeGetItem(key, defaultValue) {
        try {
            const item = localStorage.getItem(key);
            if (item === null) return defaultValue;
            return JSON.parse(item);
        } catch (e) {
            console.error(`Error parsing localStorage key "${key}":`, e);
            return defaultValue;
        }
    }

    let userPasscode = localStorage.getItem('userPasscode');
    let currentInput = '';

    // 个人资料初始化
    let myProfile = safeGetItem('myProfile', {
        avatar: '👤',
        nickname: '我',
        bio: '设置个性签名',
        region: '未知'
    });

    function updateMyProfileUI() {
        const avatars = document.querySelectorAll('#my-avatar, #my-avatar-preview');
        const nicknameDisplay = document.getElementById('my-nickname-display');
        const bioDisplay = document.getElementById('my-bio-display');
        
        avatars.forEach(el => {
            if (myProfile.avatar && myProfile.avatar.startsWith('data:image')) {
                el.innerHTML = `<img src="${myProfile.avatar}">`;
            } else {
                el.textContent = myProfile.avatar || '👤';
            }
        });
        
        if (nicknameDisplay) nicknameDisplay.textContent = myProfile.nickname;
        if (bioDisplay) bioDisplay.textContent = myProfile.bio;
        
        // 更新发布朋友圈的默认头像
        const userMomentAvatar = document.querySelector('.user-moment-avatar');
        const userMomentName = document.querySelector('.user-moment-name');
        if (userMomentAvatar) {
            if (myProfile.avatar && myProfile.avatar.startsWith('data:image')) {
                userMomentAvatar.innerHTML = `<img src="${myProfile.avatar}">`;
            } else {
                userMomentAvatar.textContent = myProfile.avatar || '👤';
            }
        }
        if (userMomentName) userMomentName.textContent = myProfile.nickname;
    }

    updateMyProfileUI();

    // 2. 数据初始化
    let contacts = safeGetItem('contacts', [
        { id: 1, name: '小助手', lastMsg: '你好！我是你的 AI 助手。', avatar: '🤖', bio: '你是一个贴心的AI小助手，性格温柔，乐于助人。', lastTime: Date.now(), type: 'contact', balance: 0 }
    ]);
    let currentChat = null; 
    let worldbooks = safeGetItem('worldbooks', {});
    // 默认开启 AI 自动回复
    if (localStorage.getItem('aiAutoReply') === null) {
        localStorage.setItem('aiAutoReply', 'true');
    }
    let customEmojis = safeGetItem('customEmojis', []);
    let favEmojis = safeGetItem('favEmojis', []);
    let moments = safeGetItem('moments', []);
    const builtinEmojis = ['😊', '😂', '🥰', '😎', '🤔', '😭', '😱', '👍', '🔥', '✨', '🎉', '❤️', '🙏', '👀', '🌟', '✅'];

    // --- 线下剧本模式状态 ---
    let rpSettings = safeGetItem('rpSettings', {
        wordCount: 300,
        perspective: 'auto',
        initiative: 'mid',
        dialogueRatio: 40,
        descRatio: 60,
        rhetoricDensity: 30,
        tempo: 'mid',
        stylePrompt: '',
        forbiddenWords: '',
        currentScene: '加载中...',
        currentAtmosphere: '✨ 氛围良好',
        isOfflineMode: false
    });
    let currentWritingMode = null; // director, continue, polish, inspire

    // 3. 加载动画逻辑
    // 确保加载条走完后正常跳转
    setTimeout(() => {
        if (loadingBar) {
            loadingBar.style.width = '100%';
        }
        
        // 增加一点延迟，确保用户能看到进度条满格
        setTimeout(() => {
            if (loadingScreen) loadingScreen.classList.remove('active');
            
            if (!userPasscode) {
                // 首次进入：引导设置密码
                if (setupScreen) setupScreen.classList.add('active');
            } else {
                // 之后进入：显示锁屏界面
                if (lockScreen) lockScreen.classList.add('active');
            }
        }, 1500); 
    }, 100);

    // 4. 密码输入逻辑 (通用)
    function handleKeypadInput(value, container, callback) {
        const dots = container.querySelectorAll('.dot');
        
        if (value === 'delete') {
            if (currentInput.length > 0) {
                currentInput = currentInput.slice(0, -1);
                dots[currentInput.length].classList.remove('filled');
            }
            return;
        }

        if (currentInput.length < 6) {
            currentInput += value;
            dots[currentInput.length - 1].classList.add('filled');
            
            if (currentInput.length === 6) {
                setTimeout(() => {
                    callback(currentInput);
                    currentInput = '';
                    dots.forEach(dot => dot.classList.remove('filled'));
                }, 300);
            }
        }
    }

    // 5. 首次设置密码
    if (setupScreen) {
        const setupKeypad = setupScreen.querySelector('.keypad');
        if (setupKeypad) {
            setupKeypad.addEventListener('click', (e) => {
                const key = e.target.closest('.key');
                if (!key || key.classList.contains('empty')) return;
                
                const value = key.dataset.value || (key.classList.contains('delete') ? 'delete' : null);
                if (!value) return;

                handleKeypadInput(value, setupScreen.querySelector('.passcode-display'), (passcode) => {
                    localStorage.setItem('userPasscode', passcode);
                    userPasscode = passcode;
                    setupScreen.classList.remove('active');
                    homeScreen.classList.add('active');
                    alert('密码设置成功！');
                });
            });
        }
    }

    // 6. 锁屏交互
    if (lockScreen) {
        lockScreen.addEventListener('click', (e) => {
            if (unlockOverlay && !unlockOverlay.classList.contains('active')) {
                unlockOverlay.classList.add('active');
            }
        });
    }

    const cancelUnlock = document.getElementById('cancel-unlock');
    if (cancelUnlock) {
        cancelUnlock.addEventListener('click', (e) => {
            e.stopPropagation();
            if (unlockOverlay) {
                unlockOverlay.classList.remove('active');
                currentInput = '';
                unlockOverlay.querySelectorAll('.dot').forEach(dot => dot.classList.remove('filled'));
            }
        });
    }

    if (unlockOverlay) {
        const unlockKeypad = unlockOverlay.querySelector('.keypad');
        if (unlockKeypad) {
            unlockKeypad.addEventListener('click', (e) => {
                const key = e.target.closest('.key');
                if (!key || key.classList.contains('empty')) return;
                
                const value = key.dataset.value || (key.classList.contains('delete') ? 'delete' : null);
                if (!value) return;

                handleKeypadInput(value, unlockOverlay.querySelector('.passcode-display'), (passcode) => {
                    if (passcode === userPasscode) {
                        unlockOverlay.classList.remove('active');
                        lockScreen.classList.remove('active');
                        homeScreen.classList.add('active');
                    } else {
                        alert('密码错误，请重试');
                    }
                });
            });
        }
    }

    // 7. 时间与天气更新
    function updateTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;
        
        const month = now.getMonth() + 1;
        const date = now.getDate();
        const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const dayName = dayNames[now.getDay()];
        
        const lockTime = document.getElementById('lock-time');
        const lockDate = document.getElementById('lock-date');
        const statusTime = document.getElementById('status-time');
        const widgetTime = document.querySelector('.widget-time');
        const widgetDate = document.querySelector('.widget-date');

        if (lockTime) lockTime.textContent = timeStr;
        if (lockDate) lockDate.textContent = `${month}月${date}日 ${dayName}`;
        if (statusTime) statusTime.textContent = timeStr;
        if (widgetTime) widgetTime.textContent = timeStr;
        if (widgetDate) widgetDate.textContent = `${month}月${date}日`;
    }

    setInterval(updateTime, 1000);
    updateTime();

    // 8. App 导航逻辑
    const settingsApp = document.getElementById('settings-app');
    const chatApp = document.getElementById('chat-app');
    const worldbookApp = document.getElementById('worldbook-app');
    const walletApp = document.getElementById('wallet-app');
    const momentsApp = document.getElementById('moments-app');
    const shopApp = document.getElementById('shop-app');
    const xhsApp = document.getElementById('xhs-app');
    const browserApp = document.getElementById('browser-app');
    const backBtns = document.querySelectorAll('.back-btn');

    function bindAppClick(selector, appElement, callback) {
        const el = document.querySelector(selector);
        if (el && appElement) {
            el.addEventListener('click', () => {
                appElement.classList.add('active');
                if (callback) callback();
            });
        }
    }

    bindAppClick('[data-app="settings"]', settingsApp, loadSettings);
    bindAppClick('[data-app="chat"]', chatApp, renderContacts);
    bindAppClick('[data-app="worldbook"]', worldbookApp, renderWorldbookList);
    bindAppClick('[data-app="wallet"]', walletApp, updateWalletUI);
    bindAppClick('[data-app="moments"]', momentsApp, renderMoments);
    bindAppClick('[data-app="shop"]', shopApp, () => {
        if (typeof renderShopProducts === 'function') renderShopProducts();
        if (typeof switchShopTab === 'function') switchShopTab('home');
    });
    bindAppClick('[data-app="xhs"]', xhsApp, () => {
        if (typeof renderXhsNotes === 'function') renderXhsNotes();
        if (typeof switchXhsView === 'function') switchXhsView('main');
    });
    bindAppClick('[data-app="browser"]', browserApp, () => {
        const urlInput = document.getElementById('browser-url');
        if (urlInput && typeof loadBrowserUrl === 'function') loadBrowserUrl(urlInput.value);
    });

    // 微信内部 Tab 切换
    document.querySelectorAll('.wechat-tab-bar .tab-item').forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            document.querySelectorAll('.wechat-tab-bar .tab-item').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.wechat-tab-content').forEach(c => c.classList.remove('active'));
            item.classList.add('active');
            document.getElementById(`tab-${tab}`).classList.add('active');
            
            if (tab === 'contacts') renderFullContactList();
        });
    });

    function renderFullContactList() {
        const list = document.getElementById('full-contact-list');
        if (!list) return;
        list.innerHTML = contacts.filter(c => c.type === 'contact').map(c => `
            <div class="contact-item" onclick="openChat(${c.id})">
                <div class="contact-avatar">${c.avatar.startsWith('data:image') ? `<img src="${c.avatar}">` : c.avatar}</div>
                <div class="contact-info">
                    <h3>${c.name}</h3>
                </div>
            </div>
        `).join('');
    }

    // 朋友圈入口
    const discoverMomentsBtn = document.getElementById('discover-moments-btn');
    if (discoverMomentsBtn) {
        discoverMomentsBtn.onclick = () => {
            if (momentsApp) momentsApp.classList.add('active');
            renderMoments();
        };
    }

    // AI发圈按钮
    const aiPostMomentBtn = document.getElementById('ai-post-moment-btn');
    if (aiPostMomentBtn) {
        aiPostMomentBtn.onclick = () => aiPostMoment();
    }

    // 钱包入口 (微信内)
    const meWalletBtn = document.getElementById('me-wallet-btn');
    if (meWalletBtn) {
        meWalletBtn.onclick = () => {
            if (walletApp) walletApp.classList.add('active');
            updateWalletUI();
        };
    }

    // 个人资料编辑
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
        editProfileBtn.onclick = () => {
            const nicknameInput = document.getElementById('my-nickname-input');
            const bioInput = document.getElementById('my-bio-input');
            const regionInput = document.getElementById('my-region-input');
            const avatarPreview = document.getElementById('my-avatar-preview');
            const modal = document.getElementById('edit-profile-modal');

            if (nicknameInput) nicknameInput.value = myProfile.nickname;
            if (bioInput) bioInput.value = myProfile.bio;
            if (regionInput) regionInput.value = myProfile.region;
            if (avatarPreview) {
                avatarPreview.innerHTML = myProfile.avatar.startsWith('data:image') ? `<img src="${myProfile.avatar}">` : myProfile.avatar;
            }
            if (modal) modal.classList.add('active');
        };
    }

    const myAvatarUpload = document.getElementById('my-avatar-upload');
    if (myAvatarUpload) {
        myAvatarUpload.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const data = event.target.result;
                    const preview = document.getElementById('my-avatar-preview');
                    if (preview) preview.innerHTML = `<img src="${data}">`;
                    myProfile.tempAvatar = data;
                };
                reader.readAsDataURL(file);
            }
        };
    }

    const saveProfileBtn = document.getElementById('save-profile-btn');
    if (saveProfileBtn) {
        saveProfileBtn.onclick = () => {
            const nicknameInput = document.getElementById('my-nickname-input');
            const bioInput = document.getElementById('my-bio-input');
            const regionInput = document.getElementById('my-region-input');
            const modal = document.getElementById('edit-profile-modal');

            myProfile.nickname = (nicknameInput ? nicknameInput.value.trim() : '') || '我';
            myProfile.bio = (bioInput ? bioInput.value.trim() : '') || '设置个性签名';
            myProfile.region = (regionInput ? regionInput.value.trim() : '') || '未知';
            if (myProfile.tempAvatar) {
                myProfile.avatar = myProfile.tempAvatar;
                delete myProfile.tempAvatar;
            }
            localStorage.setItem('myProfile', JSON.stringify(myProfile));
            updateMyProfileUI();
            if (modal) modal.classList.remove('active');
            renderMessages(); // 刷新聊天界面的头像
        };
    }

    const closeEditProfile = document.getElementById('close-edit-profile');
    if (closeEditProfile) {
        closeEditProfile.onclick = () => {
            const modal = document.getElementById('edit-profile-modal');
            if (modal) modal.classList.remove('active');
        };
    }

    backBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const overlay = btn.closest('.overlay');
            if (overlay) {
                overlay.classList.remove('active');
            } else {
                const screen = btn.closest('.screen');
                if (screen) screen.classList.remove('active');
            }
        });
    });

    // 9. 设置逻辑
    function loadSettings() {
        const apiBase = document.getElementById('api-base');
        const apiKey = document.getElementById('api-key');
        const apiModel = document.getElementById('api-model');
        if (apiBase) apiBase.value = localStorage.getItem('apiBase') || 'https://api.openai.com/v1';
        if (apiKey) apiKey.value = localStorage.getItem('apiKey') || '';
        if (apiModel) apiModel.value = localStorage.getItem('apiModel') || 'gpt-3.5-turbo';
    }

    const saveSettingsBtn = document.getElementById('save-settings');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            localStorage.setItem('apiBase', document.getElementById('api-base').value);
            localStorage.setItem('apiKey', document.getElementById('api-key').value);
            localStorage.setItem('apiModel', document.getElementById('api-model').value);
            alert('设置已保存');
        });
    }

    const fetchModelsBtn = document.getElementById('fetch-models-btn');
    if (fetchModelsBtn) {
        fetchModelsBtn.addEventListener('click', async () => {
            const base = document.getElementById('api-base').value;
            const key = document.getElementById('api-key').value;
            if (!key) return alert('请先输入 API Key');

            try {
                const response = await fetch(`${base}/models`, {
                    headers: { 'Authorization': `Bearer ${key}` }
                });
                const data = await response.json();
                const select = document.getElementById('api-model-select');
                if (select) {
                    select.innerHTML = data.data.map(m => `<option value="${m.id}">${m.id}</option>`).join('');
                    select.addEventListener('change', () => {
                        document.getElementById('api-model').value = select.value;
                    });
                }
            } catch (e) {
                alert('拉取失败，请检查 Base URL 和 Key');
            }
        });
    }

    // 10. 聊天与联系人渲染
    function renderContacts(filter = '') {
        const list = document.getElementById('contact-list');
        if (!list) return;
        const sortedContacts = [...contacts].sort((a, b) => b.lastTime - a.lastTime);
        
        list.innerHTML = sortedContacts
            .filter(c => c.name.includes(filter))
            .map(c => {
                const time = new Date(c.lastTime);
                const timeStr = `${time.getHours()}:${String(time.getMinutes()).padStart(2, '0')}`;
                const avatarHtml = c.avatar.startsWith('data:image') 
                    ? `<img src="${c.avatar}">` 
                    : c.avatar;
                return `
                    <div class="contact-item" onclick="openChat(${c.id})">
                        <div class="contact-avatar">${avatarHtml}</div>
                        <div class="contact-info">
                            <div style="display:flex; justify-content:space-between">
                                <h3>${c.name}</h3>
                                <span style="font-size:12px; opacity:0.5">${timeStr}</span>
                            </div>
                            <p>${c.lastMsg}</p>
                        </div>
                    </div>
                `;
            }).join('');
    }

    const contactSearch = document.getElementById('contact-search');
    if (contactSearch) {
        contactSearch.addEventListener('input', (e) => {
            renderContacts(e.target.value);
        });
    }

    const plusBtn = document.getElementById('add-chat-btn');
    const plusMenu = document.getElementById('chat-plus-menu');
    if (plusBtn && plusMenu) {
        plusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            plusMenu.classList.toggle('active');
        });
        document.addEventListener('click', () => plusMenu.classList.remove('active'));
    }

    const addContactModal = document.getElementById('add-contact-modal');
    const menuAddContact = document.getElementById('menu-add-contact');
    if (menuAddContact && addContactModal) {
        menuAddContact.addEventListener('click', () => {
            addContactModal.classList.add('active');
        });
    }

    const avatarUpload = document.getElementById('contact-avatar-upload');
    const avatarPreview = document.getElementById('contact-avatar-preview');
    let tempAvatar = '👤';

    if (avatarUpload) {
        avatarUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    tempAvatar = event.target.result;
                    if (avatarPreview) avatarPreview.innerHTML = `<img src="${tempAvatar}">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const saveContactBtn = document.getElementById('save-contact-btn');
    if (saveContactBtn) {
        saveContactBtn.addEventListener('click', () => {
            const name = document.getElementById('contact-nickname').value.trim();
            const bio = document.getElementById('contact-bio').value.trim();
            if (!name) return alert('请输入昵称');

            const newContact = {
                id: Date.now(),
                name: name,
                avatar: tempAvatar,
                bio: bio,
                lastMsg: '新联系人已添加',
                lastTime: Date.now(),
                type: 'contact'
            };

            contacts.push(newContact);
            localStorage.setItem('contacts', JSON.stringify(contacts));
            if (addContactModal) addContactModal.classList.remove('active');
            renderContacts();
        });
    }

    const createGroupModal = document.getElementById('create-group-modal');
    const menuCreateGroup = document.getElementById('menu-create-group');
    if (menuCreateGroup && createGroupModal) {
        menuCreateGroup.addEventListener('click', () => {
            createGroupModal.classList.add('active');
            renderMemberSelectList();
        });
    }

    function renderMemberSelectList() {
        const list = document.getElementById('group-member-select-list');
        if (!list) return;
        list.innerHTML = contacts.filter(c => c.type === 'contact').map(c => `
            <div class="member-select-item">
                <input type="checkbox" value="${c.id}">
                <div class="contact-avatar" style="width:32px; height:32px; font-size:16px">${c.avatar.startsWith('data:image') ? `<img src="${c.avatar}">` : c.avatar}</div>
                <span>${c.name}</span>
            </div>
        `).join('');
    }

    const saveGroupBtn = document.getElementById('save-group-btn');
    if (saveGroupBtn) {
        saveGroupBtn.addEventListener('click', () => {
            const name = document.getElementById('group-name').value.trim() || '未命名群聊';
            const selectedIds = Array.from(document.querySelectorAll('#group-member-select-list input:checked')).map(i => parseInt(i.value));
            if (selectedIds.length === 0) return alert('请选择群成员');

            const newGroup = {
                id: Date.now(),
                name: name,
                avatar: '👥',
                members: selectedIds,
                lastMsg: '群聊已创建',
                lastTime: Date.now(),
                type: 'group'
            };

            contacts.push(newGroup);
            localStorage.setItem('contacts', JSON.stringify(contacts));
            if (createGroupModal) createGroupModal.classList.remove('active');
            renderContacts();
        });
    }

    window.openChat = (id) => {
        currentChat = contacts.find(c => c.id === id);
        if (!currentChat) return;
        const chatWithName = document.getElementById('chat-with-name');
        const chatWindow = document.getElementById('chat-window');
        if (chatWithName) chatWithName.textContent = currentChat.name;
        if (chatWindow) chatWindow.classList.add('active');
        
        const infoBtn = document.getElementById('chat-info-btn');
        if (infoBtn) {
            infoBtn.style.display = 'block';
            infoBtn.onclick = openChatSettings;
        }

        // 初始化线下模式 UI
        updateRPModeUI();
        renderMessages();
    };

    function updateRPModeUI() {
        const statusBar = document.getElementById('chat-rp-status-bar');
        const toolsBar = document.getElementById('writing-tools-bar');
        const directorBar = document.getElementById('director-command-bar');
        const aiBtn = document.getElementById('ai-get-reply-btn');
        const sceneTag = document.getElementById('chat-scene-tag');
        const atmosphereTag = document.getElementById('chat-atmosphere-tag');

        if (rpSettings.isOfflineMode) {
            if (statusBar) statusBar.style.display = 'flex';
            if (toolsBar) toolsBar.style.display = 'flex';
            if (aiBtn) aiBtn.style.display = 'none'; // 线下模式使用模式按钮
            if (sceneTag) sceneTag.textContent = `📍 ${rpSettings.currentScene || '探索中...'}`;
            if (atmosphereTag) atmosphereTag.textContent = rpSettings.currentAtmosphere || '✨ 氛围良好';
        } else {
            if (statusBar) statusBar.style.display = 'none';
            if (toolsBar) toolsBar.style.display = 'none';
            if (directorBar) directorBar.style.display = 'none';
            if (aiBtn) aiBtn.style.display = 'block';
        }
    }

    function openChatSettings() {
        const overlay = document.getElementById('chat-settings-overlay');
        const memberGrid = document.getElementById('chat-member-grid');
        const groupOnly = document.getElementById('group-only-settings');
        const offlineSwitch = document.getElementById('offline-mode-switch');
        const quickSettings = document.getElementById('offline-mode-quick-settings');
        
        if (!overlay || !currentChat) return;

        if (offlineSwitch) {
            offlineSwitch.checked = rpSettings.isOfflineMode;
            if (quickSettings) quickSettings.style.display = rpSettings.isOfflineMode ? 'block' : 'none';
            
            offlineSwitch.onchange = () => {
                rpSettings.isOfflineMode = offlineSwitch.checked;
                localStorage.setItem('rpSettings', JSON.stringify(rpSettings));
                if (quickSettings) quickSettings.style.display = rpSettings.isOfflineMode ? 'block' : 'none';
                updateRPModeUI();
            };
        }

        const advBtn = document.getElementById('open-adv-rp-menu');
        if (advBtn) {
            advBtn.onclick = () => {
                openRPAdvancedSettings();
            };
        }

        // 渲染成员头像
        if (memberGrid) {
            let members = [];
            if (currentChat.type === 'group') {
                members = contacts.filter(c => currentChat.members.includes(c.id));
            } else {
                members = [currentChat, { name: myProfile.nickname, avatar: myProfile.avatar }];
            }
            
            memberGrid.innerHTML = members.map(m => `
                <div class="group-member-item">
                    <div class="contact-avatar">${(m.avatar && m.avatar.startsWith('data:image')) ? `<img src="${m.avatar}">` : (m.avatar || '👤')}</div>
                    <span>${m.name || m.nickname}</span>
                </div>
            `).join('') + '<div class="add-member-btn" onclick="alert(\'邀请功能开发中\')">+</div>';
        }

        // 群聊特有设置
        if (groupOnly) {
            if (currentChat.type === 'group') {
                groupOnly.style.display = 'block';
                document.getElementById('group-info-name-input').value = currentChat.name || '';
                document.getElementById('group-info-notice').value = currentChat.notice || '';
                document.getElementById('group-my-nickname').value = currentChat.myNickname || '';
            } else {
                groupOnly.style.display = 'none';
            }
        }

        overlay.classList.add('active');
    }

    const closeChatSettings = document.getElementById('close-chat-settings');
    if (closeChatSettings) {
        closeChatSettings.onclick = () => document.getElementById('chat-settings-overlay').classList.remove('active');
    }

    const clearChatHistory = document.getElementById('clear-chat-history');
    if (clearChatHistory) {
        clearChatHistory.onclick = () => {
            if (confirm('确定清空聊天记录吗？')) {
                localStorage.removeItem(`msgs_${currentChat.id}`);
                renderMessages();
                alert('已清空');
            }
        };
    }

    const viewContactProfile = document.getElementById('view-contact-profile');
    if (viewContactProfile) {
        viewContactProfile.onclick = () => {
            if (currentChat.type === 'group') {
                alert('群聊资料查看功能开发中');
            } else {
                alert(`角色人设：\n${currentChat.bio}`);
            }
        };
    }

    const saveGroupInfoBtn = document.getElementById('save-group-info-btn');
    if (saveGroupInfoBtn) {
        saveGroupInfoBtn.onclick = () => {
            currentChat.name = document.getElementById('group-info-name-input').value;
            currentChat.notice = document.getElementById('group-info-notice').value;
            currentChat.myNickname = document.getElementById('group-my-nickname').value;
            localStorage.setItem('contacts', JSON.stringify(contacts));
            const chatWithName = document.getElementById('chat-with-name');
            if (chatWithName) chatWithName.textContent = currentChat.name;
            const groupInfoOverlay = document.getElementById('chat-settings-overlay');
            if (groupInfoOverlay) groupInfoOverlay.classList.remove('active');
            renderContacts();
        };
    }

    const exitGroupBtn = document.getElementById('exit-group-btn');
    if (exitGroupBtn) {
        exitGroupBtn.onclick = () => {
            if (confirm('确定删除并退出群聊吗？')) {
                contacts = contacts.filter(c => c.id !== currentChat.id);
                localStorage.setItem('contacts', JSON.stringify(contacts));
                const groupInfoOverlay = document.getElementById('chat-settings-overlay');
                const chatWindow = document.getElementById('chat-window');
                if (groupInfoOverlay) groupInfoOverlay.classList.remove('active');
                if (chatWindow) chatWindow.classList.remove('active');
                renderContacts();
            }
        };
    }

    const closeChatBtn = document.getElementById('close-chat');
    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', () => {
            const chatWindow = document.getElementById('chat-window');
            if (chatWindow) chatWindow.classList.remove('active');
            closePanels();
        });
    }

    function renderMessages() {
        const msgContainer = document.getElementById('chat-messages');
        if (!msgContainer || !currentChat) return;
        const msgs = safeGetItem(`msgs_${currentChat.id}`, []);
        let lastTime = 0;
        
        msgContainer.innerHTML = msgs.map((m, idx) => {
            let timeDivider = '';
            if (m.timestamp - lastTime > 300000) {
                const date = new Date(m.timestamp);
                timeDivider = `<div class="time-divider"><span>${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}</span></div>`;
                lastTime = m.timestamp;
            }
            
            let contentHtml = '';
            if (m.type === 'image' || (m.content && m.content.startsWith('data:image'))) {
                contentHtml = `<img src="${m.content}" class="emoji-img" onclick="window.open('${m.content}')">`;
            } else if (m.type === 'redpacket') {
                contentHtml = `
                    <div class="message redpacket" onclick="openRedPacket('${m.id}')">
                        <div class="rp-msg-top">
                            <div class="rp-msg-icon">🧧</div>
                            <div class="rp-msg-text">
                                <h4>${m.note}</h4>
                                <p>${m.status === 'opened' ? '红包已拆开' : '查看红包'}</p>
                            </div>
                        </div>
                        <div class="rp-msg-bottom">微信红包</div>
                    </div>`;
            } else if (m.type === 'transfer') {
                contentHtml = `
                    <div class="message transfer" onclick="handleTransfer('${m.id}')">
                        <div class="tf-msg-top">
                            <div class="tf-msg-icon">💸</div>
                            <div class="tf-msg-text">
                                <h4>¥${m.amount}</h4>
                                <p>${m.status === 'received' ? '已收款' : m.note}</p>
                            </div>
                        </div>
                        <div class="tf-msg-bottom">微信转账</div>
                    </div>`;
            } else if (m.type === 'voice') {
                contentHtml = `
                    <div class="message voice" onclick="playVoice(this)">
                        <span class="voice-icon">🔊</span>
                        <span class="voice-duration">${m.duration}"</span>
                    </div>`;
            } else {
                contentHtml = m.content || '';
            }

            const isMe = m.role === 'user';
            const sender = isMe ? myProfile : (currentChat.type === 'group' ? (contacts.find(c => c.id === m.senderId) || { name: '未知', avatar: '👤' }) : currentChat);
            const avatarHtml = (sender.avatar && sender.avatar.startsWith('data:image')) ? `<img src="${sender.avatar}">` : (sender.avatar || '👤');

            return `
                ${timeDivider}
                <div class="message-wrapper ${m.role === 'user' ? 'sent' : 'received'}" oncontextmenu="showMsgActionMenu(event, ${idx})">
                    <div class="msg-avatar" onclick="showMsgActionMenu(event, ${idx})">${avatarHtml}</div>
                    <div class="message ${m.role === 'user' ? 'sent' : 'received'} ${m.isRP ? 'rp-content' : ''}" 
                         style="${['redpacket', 'transfer'].includes(m.type) ? 'padding:0; background:none' : ''}"
                         onclick="showMsgActionMenu(event, ${idx})">
                        ${contentHtml}
                    </div>
                </div>
            `;
        }).join('');
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }

    window.playVoice = (el) => {
        el.style.opacity = '0.5';
        setTimeout(() => el.style.opacity = '1', 1000);
    };

    const sendMsgBtn = document.getElementById('send-msg-btn');
    if (sendMsgBtn) {
        sendMsgBtn.addEventListener('click', sendMessage);
    }
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    const voiceMsgBtn = document.getElementById('voice-msg-btn');
    if (voiceMsgBtn) {
        voiceMsgBtn.onclick = () => {
            const content = prompt('请输入语音内容（模拟语音转文字）');
            if (content) {
                const msgs = safeGetItem(`msgs_${currentChat.id}`, []);
                msgs.push({ 
                    role: 'user', 
                    type: 'voice', 
                    content: content, 
                    duration: Math.ceil(content.length / 3), 
                    timestamp: Date.now() 
                });
                localStorage.setItem(`msgs_${currentChat.id}`, JSON.stringify(msgs));
                currentChat.lastMsg = '[语音] ' + content;
                currentChat.lastTime = Date.now();
                localStorage.setItem('contacts', JSON.stringify(contacts));
                renderMessages();
                renderContacts();
                if (localStorage.getItem('aiAutoReply') === 'true') {
                    triggerAIResponse(msgs);
                }
            }
        };
    }

    const aiGetReplyBtn = document.getElementById('ai-get-reply-btn');
    if (aiGetReplyBtn) {
        aiGetReplyBtn.addEventListener('click', async () => {
            const input = document.getElementById('chat-input');
            const content = input.value.trim();
            
            if (content) {
                // 1. 发送用户消息
                const msgs = safeGetItem(`msgs_${currentChat.id}`, []);
                msgs.push({ role: 'user', content, timestamp: Date.now() });
                localStorage.setItem(`msgs_${currentChat.id}`, JSON.stringify(msgs));
                
                currentChat.lastMsg = content;
                currentChat.lastTime = Date.now();
                localStorage.setItem('contacts', JSON.stringify(contacts));
                
                input.value = '';
                renderMessages();
                renderContacts();
                
                // 2. 强制触发 AI 回复
                triggerAIResponse(msgs);
            } else {
                // 如果输入框为空，基于历史记录获取回复
                const msgs = safeGetItem(`msgs_${currentChat.id}`, []);
                if (msgs.length > 0) {
                    triggerAIResponse(msgs);
                } else {
                    alert('请先输入消息或确保有聊天记录');
                }
            }
        });
    }

    async function sendMessage() {
        const input = document.getElementById('chat-input');
        const content = input.value.trim();
        if (!content || !currentChat) return;

        const msgs = safeGetItem(`msgs_${currentChat.id}`, []);
        msgs.push({ role: 'user', content, timestamp: Date.now() });
        localStorage.setItem(`msgs_${currentChat.id}`, JSON.stringify(msgs));
        
        currentChat.lastMsg = content;
        currentChat.lastTime = Date.now();
        localStorage.setItem('contacts', JSON.stringify(contacts));
        
        input.value = '';
        renderMessages();
        renderContacts();

        if (localStorage.getItem('aiAutoReply') === 'true') {
            triggerAIResponse(msgs);
        }
    }

    async function triggerAIResponse(currentMsgs, isManual = false) {
        if (!currentChat) return;
        const typingStatus = document.getElementById('typing-status');
        const chatId = currentChat.id;
        if (typingStatus) typingStatus.style.display = 'block';

        try {
            const lastMsg = currentMsgs[currentMsgs.length - 1];
            
            // 模拟 AI 领取红包/转账
            if (lastMsg.role === 'user' && (lastMsg.type === 'redpacket' || lastMsg.type === 'transfer')) {
                setTimeout(() => {
                    const latestMsgs = safeGetItem(`msgs_${chatId}`, []);
                    const msgToUpdate = latestMsgs.find(m => m.timestamp === lastMsg.timestamp && m.role === 'user');
                    
                    if (msgToUpdate && (msgToUpdate.status === 'active' || msgToUpdate.status === 'pending')) {
                        msgToUpdate.status = msgToUpdate.type === 'redpacket' ? 'opened' : 'received';
                        
                        // AI 领取后的回复
                        const replyText = msgToUpdate.type === 'redpacket' ? '谢谢老板的红包！🧧' : '收到啦，谢谢！💰';
                        latestMsgs.push({ 
                            role: 'assistant', 
                            content: replyText, 
                            timestamp: Date.now()
                        });
                        
                        localStorage.setItem(`msgs_${chatId}`, JSON.stringify(latestMsgs));
                        
                        if (currentChat && currentChat.id === chatId) {
                            currentChat.lastMsg = replyText;
                            currentChat.lastTime = Date.now();
                            localStorage.setItem('contacts', JSON.stringify(contacts));
                            renderContacts();
                            renderMessages();
                        }
                    }
                }, 2000);
                if (typingStatus) typingStatus.style.display = 'none';
                return;
            }

            const lastUserMsg = currentMsgs.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
            const matchedContent = getMatchedWorldbookContent(currentChat.id, lastUserMsg, 'ai');
            
            let systemPrompt = `你是 ${currentChat.name}。性格：${currentChat.bio || '普通朋友'}。`;
            if (matchedContent) {
                systemPrompt += `\n背景设定：\n${matchedContent}`;
            }
            systemPrompt += `\n请根据设定的语气、动作、对话逻辑进行回复。回复应简短、口语化。`;

            const contextMsgs = [
                { role: 'system', content: systemPrompt },
                ...currentMsgs.slice(-10).map(m => ({ role: m.role, content: m.content }))
            ];

            const aiResponse = await callAI(contextMsgs);
            
            if (aiResponse && currentChat && currentChat.id === chatId) {
                // 模拟打字延迟
                await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
                
                // 重新读取最新的消息列表，防止发送期间产生的并发冲突导致覆盖
                const latestMsgs = safeGetItem(`msgs_${chatId}`, []);
                
                // 随机决定是否发送语音消息
                const isVoice = Math.random() > 0.8;
                
                latestMsgs.push({ 
                    role: 'assistant', 
                    type: isVoice ? 'voice' : 'text',
                    content: aiResponse, 
                    duration: isVoice ? Math.ceil(aiResponse.length / 3) : null,
                    timestamp: Date.now()
                });
                localStorage.setItem(`msgs_${chatId}`, JSON.stringify(latestMsgs));
                
                currentChat.lastMsg = isVoice ? '[语音] ' + aiResponse : aiResponse;
                currentChat.lastTime = Date.now();
                localStorage.setItem('contacts', JSON.stringify(contacts));
                
                renderContacts();
                renderMessages();
            }
        } catch (error) {
            console.error('AI Reply Error:', error);
        } finally {
            if (typingStatus) typingStatus.style.display = 'none';
        }
    }

    // 11. 钱包与红包逻辑
    let walletBalance = parseFloat(localStorage.getItem('walletBalance')) || 1000.00;
    let bills = safeGetItem('bills', []);

    function updateWalletUI() {
        const balanceEl = document.getElementById('wallet-balance');
        if (balanceEl) balanceEl.textContent = walletBalance.toFixed(2);
    }

    function addBill(title, amount, type) {
        const bill = { id: Date.now(), title, amount, type, time: Date.now() };
        bills.unshift(bill);
        localStorage.setItem('bills', JSON.stringify(bills));
        if (type === 'income') walletBalance += amount;
        else walletBalance -= amount;
        localStorage.setItem('walletBalance', walletBalance.toFixed(2));
        updateWalletUI();
    }

    const chatTransferBtn = document.getElementById('chat-transfer-btn');
    if (chatTransferBtn) {
        chatTransferBtn.addEventListener('click', () => {
            if (currentChat.type === 'group') return alert('群聊暂不支持直接转账');
            const transferModal = document.getElementById('transfer-modal');
            const targetName = document.getElementById('transfer-target-name');
            const targetAvatar = document.getElementById('transfer-target-avatar');
            if (transferModal) transferModal.classList.add('active');
            if (targetName) targetName.textContent = currentChat.name;
            if (targetAvatar) targetAvatar.innerHTML = currentChat.avatar.startsWith('data:image') ? `<img src="${currentChat.avatar}">` : currentChat.avatar;
        });
    }

    const confirmTransferBtn = document.getElementById('confirm-transfer-btn');
    if (confirmTransferBtn) {
        confirmTransferBtn.addEventListener('click', () => {
            const amount = parseFloat(document.getElementById('transfer-amount').value);
            const note = document.getElementById('transfer-note').value || '转账';
            if (isNaN(amount) || amount <= 0) return alert('请输入有效金额');
            if (amount > walletBalance) return alert('余额不足');

            const msgId = 'tf_' + Date.now();
            const msgs = safeGetItem(`msgs_${currentChat.id}`, []);
            msgs.push({ 
                id: msgId, role: 'user', type: 'transfer', amount: amount.toFixed(2), note: note, status: 'pending', timestamp: Date.now() 
            });
            localStorage.setItem(`msgs_${currentChat.id}`, JSON.stringify(msgs));
            addBill(`转账给-${currentChat.name}`, amount, 'expense');
            const transferModal = document.getElementById('transfer-modal');
            if (transferModal) transferModal.classList.remove('active');
            renderMessages();
            closePanels();
            
            // 触发 AI 领取逻辑
            if (localStorage.getItem('aiAutoReply') === 'true') {
                triggerAIResponse(msgs);
            }
        });
    }

    window.handleTransfer = (msgId) => {
        const msgs = safeGetItem(`msgs_${currentChat.id}`, []);
        const msg = msgs.find(m => m.id === msgId);
        if (!msg || msg.status !== 'pending') return;

        if (msg.role === 'user') {
            alert('等待对方收款');
        } else {
            if (confirm(`确认收钱 ¥${msg.amount}？`)) {
                msg.status = 'received';
                addBill(`收到-${currentChat.name}的转账`, parseFloat(msg.amount), 'income');
                localStorage.setItem(`msgs_${currentChat.id}`, JSON.stringify(msgs));
                renderMessages();
            }
        }
    };

    const chatRedpacketBtn = document.getElementById('chat-redpacket-btn');
    if (chatRedpacketBtn) {
        chatRedpacketBtn.addEventListener('click', () => {
            const rpModal = document.getElementById('redpacket-modal');
            if (rpModal) rpModal.classList.add('active');
        });
    }

    const confirmRpBtn = document.getElementById('confirm-rp-btn');
    if (confirmRpBtn) {
        confirmRpBtn.addEventListener('click', () => {
            const amount = parseFloat(document.getElementById('rp-amount').value);
            const count = parseInt(document.getElementById('rp-count').value);
            const note = document.getElementById('rp-note').value || '恭喜发财，大吉大利';
            if (isNaN(amount) || amount <= 0) return alert('请输入有效金额');
            if (amount > walletBalance) return alert('余额不足');

            const msgId = 'rp_' + Date.now();
            const msgs = safeGetItem(`msgs_${currentChat.id}`, []);
            msgs.push({ 
                id: msgId, role: 'user', type: 'redpacket', amount: amount.toFixed(2), count: count, note: note, status: 'active', timestamp: Date.now() 
            });
            localStorage.setItem(`msgs_${currentChat.id}`, JSON.stringify(msgs));
            addBill('发红包', amount, 'expense');
            const rpModal = document.getElementById('redpacket-modal');
            if (rpModal) rpModal.classList.remove('active');
            renderMessages();
            closePanels();
            
            // 触发 AI 领取逻辑
            if (localStorage.getItem('aiAutoReply') === 'true') {
                triggerAIResponse(msgs);
            }
        });
    }

    const rpOverlay = document.getElementById('rp-open-overlay');
    window.openRedPacket = (msgId) => {
        const msgs = safeGetItem(`msgs_${currentChat.id}`, []);
        const msg = msgs.find(m => m.id === msgId);
        if (!msg) return;

        if (rpOverlay) rpOverlay.classList.add('active');
        const rpNoteDisplay = document.getElementById('rp-note-display');
        const rpSenderName = document.getElementById('rp-sender-name');
        const rpSenderAvatar = document.getElementById('rp-sender-avatar');
        
        if (rpNoteDisplay) rpNoteDisplay.textContent = msg.note;
        const isMe = msg.role === 'user';
        const sender = isMe ? myProfile : (currentChat.type === 'group' ? (contacts.find(c => c.id === msg.senderId) || { name: '未知', avatar: '👤' }) : currentChat);
        if (rpSenderName) rpSenderName.textContent = sender.nickname || sender.name;
        if (rpSenderAvatar) rpSenderAvatar.innerHTML = (sender.avatar && sender.avatar.startsWith('data:image')) ? `<img src="${sender.avatar}">` : (sender.avatar || '👤');

        const openBtn = document.getElementById('rp-open-btn');
        const resultDiv = document.getElementById('rp-result');
        
        if (msg.status === 'opened') {
            if (openBtn) openBtn.style.display = 'none';
            if (resultDiv) {
                resultDiv.style.display = 'block';
                const winAmount = (parseFloat(msg.amount) / msg.count).toFixed(2);
                document.getElementById('rp-opened-amount').textContent = winAmount;
            }
        } else {
            if (openBtn) {
                openBtn.style.display = 'flex';
                openBtn.onclick = () => {
                    openBtn.classList.add('spinning');
                    setTimeout(() => {
                        openBtn.classList.remove('spinning');
                        openBtn.style.display = 'none';
                        if (resultDiv) resultDiv.style.display = 'block';
                        const winAmount = (parseFloat(msg.amount) / msg.count).toFixed(2);
                        const rpOpenedAmount = document.getElementById('rp-opened-amount');
                        if (rpOpenedAmount) rpOpenedAmount.textContent = winAmount;
                        
                        if (msg.role === 'user') {
                            // 用户领自己的红包（模拟）
                            addBill('抢红包', parseFloat(winAmount), 'income');
                        } else {
                            // 用户领AI的红包
                            addBill('抢红包', parseFloat(winAmount), 'income');
                        }
                        
                        msg.status = 'opened';
                        localStorage.setItem(`msgs_${currentChat.id}`, JSON.stringify(msgs));
                        renderMessages();
                    }, 1000);
                };
            }
            if (resultDiv) resultDiv.style.display = 'none';
        }
    };

    const closeRpCard = document.getElementById('close-rp-card');
    if (closeRpCard) {
        closeRpCard.onclick = () => {
            if (rpOverlay) rpOverlay.classList.remove('active');
        };
    }

    // 12. 世界书与条目
    function getMatchedWorldbookContent(charId, text, timing) {
        const charWorldbook = worldbooks[charId] || [];
        const matchedEntries = charWorldbook.filter(entry => {
            if (!entry.enabled) return false;
            if (entry.triggerTiming !== 'both' && entry.triggerTiming !== timing) return false;
            if (entry.triggerType === 'keyword') {
                const keywords = (entry.triggerVal || '').split(',').map(k => k.trim());
                return keywords.some(k => k && text.includes(k));
            } else if (entry.triggerType === 'regex') {
                try {
                    const regex = new RegExp(entry.triggerVal, 'i');
                    return regex.test(text);
                } catch (e) { return false; }
            }
            return false;
        });
        return matchedEntries.sort((a, b) => (b.priority || 0) - (a.priority || 0)).map(e => e.content).join('\n');
    }

    function renderWorldbookList() {
        const list = document.getElementById('worldbook-list');
        if (!list) return;
        list.innerHTML = contacts.filter(c => c.type === 'contact').map(c => `
            <div class="contact-item" onclick="openWorldbookDetail(${c.id})">
                <div class="contact-avatar">${c.avatar.startsWith('data:image') ? `<img src="${c.avatar}">` : c.avatar}</div>
                <div class="contact-info">
                    <h3>${c.name}</h3>
                    <p>${(worldbooks[c.id] || []).length} 条设定</p>
                </div>
            </div>
        `).join('');
    }

    let currentCharId = null;
    let currentEntryIdx = null;

    window.openWorldbookDetail = (id) => {
        currentCharId = id;
        const char = contacts.find(c => c.id === id);
        if (!char) return;
        const wbCharName = document.getElementById('worldbook-char-name');
        const wbDetail = document.getElementById('worldbook-detail');
        if (wbCharName) wbCharName.textContent = `${char.name} 的设定`;
        if (wbDetail) wbDetail.classList.add('active');
        renderEntryList();
    };

    function renderEntryList() {
        const list = document.getElementById('entry-list');
        if (!list) return;
        const entries = worldbooks[currentCharId] || [];
        list.innerHTML = entries.map((e, idx) => `
            <div class="entry-card" onclick="openEntryEditor(${idx})">
                <div class="entry-card-header">
                    <span class="entry-card-title">${e.name}</span>
                    <span class="status-tag ${e.enabled ? 'active' : ''}">${e.enabled ? '已启用' : '已禁用'}</span>
                </div>
                <div class="entry-card-meta">
                    <span>优先级: ${e.priority}</span>
                    <span>触发: ${e.triggerType === 'keyword' ? '关键词' : '正则'}</span>
                </div>
                <div class="entry-card-content">${e.content}</div>
            </div>
        `).join('');
    }

    window.openEntryEditor = (idx = null) => {
        currentEntryIdx = idx;
        const editor = document.getElementById('entry-editor');
        const deleteBtn = document.getElementById('delete-entry-btn');
        if (!editor) return;
        if (idx !== null) {
            const entry = worldbooks[currentCharId][idx];
            document.getElementById('entry-name').value = entry.name;
            document.getElementById('entry-enabled').checked = entry.enabled;
            document.getElementById('entry-priority').value = entry.priority;
            document.getElementById('entry-trigger-type').value = entry.triggerType;
            document.getElementById('entry-trigger-val').value = entry.triggerVal;
            document.getElementById('entry-trigger-timing').value = entry.triggerTiming;
            document.getElementById('entry-content').value = entry.content;
            if (deleteBtn) deleteBtn.style.display = 'block';
        } else {
            document.getElementById('entry-name').value = '';
            document.getElementById('entry-enabled').checked = true;
            document.getElementById('entry-priority').value = '1';
            document.getElementById('entry-trigger-type').value = 'keyword';
            document.getElementById('entry-trigger-val').value = '';
            document.getElementById('entry-trigger-timing').value = 'user';
            document.getElementById('entry-content').value = '';
            if (deleteBtn) deleteBtn.style.display = 'none';
        }
        editor.classList.add('active');
    };

    const addEntryBtn = document.getElementById('add-entry-btn');
    if (addEntryBtn) addEntryBtn.onclick = () => openEntryEditor();
    const closeEntryEditor = document.getElementById('close-entry-editor');
    if (closeEntryEditor) closeEntryEditor.onclick = () => document.getElementById('entry-editor').classList.remove('active');
    const closeWorldbookDetail = document.getElementById('close-worldbook-detail');
    if (closeWorldbookDetail) closeWorldbookDetail.onclick = () => document.getElementById('worldbook-detail').classList.remove('active');

    const saveEntryBtn = document.getElementById('save-entry-btn');
    if (saveEntryBtn) {
        saveEntryBtn.onclick = () => {
            const entry = {
                name: document.getElementById('entry-name').value.trim() || '未命名条目',
                enabled: document.getElementById('entry-enabled').checked,
                priority: parseInt(document.getElementById('entry-priority').value) || 1,
                triggerType: document.getElementById('entry-trigger-type').value,
                triggerVal: document.getElementById('entry-trigger-val').value.trim(),
                triggerTiming: document.getElementById('entry-trigger-timing').value,
                content: document.getElementById('entry-content').value.trim()
            };
            if (!worldbooks[currentCharId]) worldbooks[currentCharId] = [];
            if (currentEntryIdx !== null) worldbooks[currentCharId][currentEntryIdx] = entry;
            else worldbooks[currentCharId].push(entry);
            localStorage.setItem('worldbooks', JSON.stringify(worldbooks));
            const entryEditor = document.getElementById('entry-editor');
            if (entryEditor) entryEditor.classList.remove('active');
            renderEntryList();
        };
    }

    const deleteEntryBtn = document.getElementById('delete-entry-btn');
    if (deleteEntryBtn) {
        deleteEntryBtn.onclick = () => {
            if (confirm('确定删除该条目吗？')) {
                worldbooks[currentCharId].splice(currentEntryIdx, 1);
                localStorage.setItem('worldbooks', JSON.stringify(worldbooks));
                const entryEditor = document.getElementById('entry-editor');
                if (entryEditor) entryEditor.classList.remove('active');
                renderEntryList();
            }
        };
    }

    // 14. 朋友圈逻辑
    function renderMoments() {
        const container = document.getElementById('moments-items-container');
        if (!container) return;
        if (moments.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding:40px; opacity:0.5">暂无动态</p>';
            return;
        }
        container.innerHTML = moments.map((m, idx) => {
            const time = new Date(m.timestamp);
            const timeStr = `${time.getMonth()+1}月${time.getDate()}日 ${time.getHours()}:${String(time.getMinutes()).padStart(2, '0')}`;
            const avatarHtml = (m.userAvatar && m.userAvatar.startsWith('data:image')) ? `<img src="${m.userAvatar}">` : (m.userAvatar || '👤');
            return `
                <div class="moment-item">
                    <div class="moment-avatar">${avatarHtml}</div>
                    <div class="moment-main">
                        <div class="moment-name">${m.userName}</div>
                        <div class="moment-text">${m.text}</div>
                        ${m.image ? `<img src="${m.image}" class="moment-image" onclick="window.open('${m.image}')">` : ''}
                        <div class="moment-footer">
                            <span>${timeStr}</span>
                            <div class="moment-actions">
                                <button class="moment-action-btn ai-btn" onclick="aiInteractMoment(${idx})" title="角色互动">🤖 互动</button>
                                <button class="moment-action-btn" onclick="likeMoment(${idx})">❤️ ${m.likes || 0}</button>
                                <button class="moment-action-btn" onclick="commentMoment(${idx})">💬</button>
                            </div>
                        </div>
                        ${(m.comments && m.comments.length) ? `
                            <div class="moment-comments-box">
                                ${m.comments.map(c => `<div class="comment-item"><span class="comment-name">${c.userName}:</span> ${c.text}</div>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    window.aiInteractMoment = async (idx) => {
        const moment = moments[idx];
        // 过滤掉“我”，只让 AI 角色互动
        const aiContacts = contacts.filter(c => c.type === 'contact');
        if (aiContacts.length === 0) return alert('请先添加 AI 联系人');
        
        const randomContact = aiContacts[Math.floor(Math.random() * aiContacts.length)];
        
        // 1. 角色点赞
        moment.likes++;
        
        // 2. 角色评论
        const aiComment = await callAI([
            { role: 'system', content: `你是 ${randomContact.name}。性格设定：${randomContact.bio}。你刚看到朋友圈有一条动态："${moment.text}"。请基于你的性格发表一句简短、高拟真的评论。评论要贴合文案内容，语气自然。` }
        ]);
        
        if (aiComment) {
            if (!moment.comments) moment.comments = [];
            moment.comments.push({ userName: randomContact.name, text: aiComment });
        }
        
        localStorage.setItem('moments', JSON.stringify(moments));
        renderMoments();
    };

    async function aiPostMoment() {
        const aiContacts = contacts.filter(c => c.type === 'contact');
        if (aiContacts.length === 0) return alert('请先添加 AI 联系人');
        
        const randomContact = aiContacts[Math.floor(Math.random() * aiContacts.length)];
        const aiContent = await callAI([
            { role: 'system', content: `你是 ${randomContact.name}。性格设定：${randomContact.bio}。请写一条符合你人设的朋友圈文案，内容要生活化、有沉浸感，不要带任何 AI 助手的口吻。` }
        ]);

        if (aiContent) {
            const newMoment = {
                id: Date.now(),
                userName: randomContact.name,
                userAvatar: randomContact.avatar,
                text: aiContent,
                image: null,
                timestamp: Date.now(),
                likes: 0,
                comments: []
            };
            moments.unshift(newMoment);
            localStorage.setItem('moments', JSON.stringify(moments));
            renderMoments();
            
            // 模拟其他角色互动
            setTimeout(() => simulateAIInteraction(newMoment), 2000);
        }
    }

    const postMomentBtn = document.getElementById('post-moment-btn');
    if (postMomentBtn) {
        postMomentBtn.onclick = () => {
            const postMomentModal = document.getElementById('post-moment-modal');
            if (postMomentModal) postMomentModal.classList.add('active');
        };
    }
    const closePostMoment = document.getElementById('close-post-moment');
    if (closePostMoment) {
        closePostMoment.onclick = () => {
            const postMomentModal = document.getElementById('post-moment-modal');
            if (postMomentModal) postMomentModal.classList.remove('active');
        };
    }

    let tempMomentImage = null;
    const momentImageInput = document.getElementById('moment-image-input');
    if (momentImageInput) {
        momentImageInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    tempMomentImage = event.target.result;
                    const preview = document.getElementById('moment-image-preview');
                    if (preview) preview.innerHTML = `<img src="${tempMomentImage}" style="width:80px;height:80px;object-fit:cover;border-radius:4px">`;
                };
                reader.readAsDataURL(file);
            }
        };
    }

    const submitMomentBtn = document.getElementById('submit-moment-btn');
    if (submitMomentBtn) {
        submitMomentBtn.onclick = () => {
            const textInput = document.getElementById('moment-text');
            const text = textInput ? textInput.value.trim() : '';
            if (!text && !tempMomentImage) return alert('请输入内容或上传图片');
            const newMoment = { id: Date.now(), userName: '我', userAvatar: '👤', text: text, image: tempMomentImage, timestamp: Date.now(), likes: 0, comments: [] };
            moments.unshift(newMoment);
            localStorage.setItem('moments', JSON.stringify(moments));
            if (textInput) textInput.value = '';
            tempMomentImage = null;
            const preview = document.getElementById('moment-image-preview');
            if (preview) preview.innerHTML = '';
            const postMomentModal = document.getElementById('post-moment-modal');
            if (postMomentModal) postMomentModal.classList.remove('active');
            renderMoments();
            simulateAIInteraction(newMoment);
        };
    }

    function simulateAIInteraction(moment) {
        const randomContact = contacts[Math.floor(Math.random() * contacts.length)];
        setTimeout(() => {
            if (Math.random() > 0.3) {
                moment.likes++;
                localStorage.setItem('moments', JSON.stringify(moments));
                renderMoments();
            }
            setTimeout(async () => {
                const aiComment = await callAI([{ role: 'system', content: `你是 ${randomContact.name}。你刚看到朋友圈有一条动态："${moment.text}"。请基于你的性格发表一句简短的评论。性格设定：${randomContact.bio}` }]);
                if (aiComment) {
                    moment.comments.push({ userName: randomContact.name, text: aiComment });
                    localStorage.setItem('moments', JSON.stringify(moments));
                    renderMoments();
                }
            }, 2000);
        }, 3000);
    }

    window.likeMoment = (idx) => {
        moments[idx].likes++;
        localStorage.setItem('moments', JSON.stringify(moments));
        renderMoments();
    };

    window.commentMoment = (idx) => {
        const text = prompt('请输入评论内容');
        if (text) {
            moments[idx].comments.push({ userName: '我', text: text });
            localStorage.setItem('moments', JSON.stringify(moments));
            renderMoments();
        }
    };

    // 15. 表情包与面板逻辑
    const emojiPanel = document.getElementById('emoji-panel');
    const morePanel = document.getElementById('more-panel');

    const chatImageBtn = document.getElementById('chat-image-btn');
    const chatImageUpload = document.getElementById('chat-image-upload');
    if (chatImageBtn && chatImageUpload) {
        chatImageBtn.onclick = () => chatImageUpload.click();
        chatImageUpload.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    sendEmoji(event.target.result); 
                };
                reader.readAsDataURL(file);
            }
        };
    }

    const emojiPanelBtn = document.getElementById('emoji-panel-btn');
    if (emojiPanelBtn) {
        emojiPanelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (morePanel) morePanel.classList.remove('active');
            if (emojiPanel) {
                const isActive = emojiPanel.classList.contains('active');
                emojiPanel.classList.toggle('active');
                if (!isActive) renderEmojiList();
            }
        });
    }

    const morePanelBtn = document.getElementById('more-panel-btn');
    if (morePanelBtn) {
        morePanelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (emojiPanel) emojiPanel.classList.remove('active');
            if (morePanel) morePanel.classList.toggle('active');
        });
    }

    // 点击空白处收起面板
    document.addEventListener('click', (e) => {
        const bottomArea = document.querySelector('.chat-bottom-area');
        if (bottomArea && !bottomArea.contains(e.target)) {
            closePanels();
        }
    });

    function closePanels() {
        if (emojiPanel) emojiPanel.classList.remove('active');
        if (morePanel) morePanel.classList.remove('active');
    }

    function renderEmojiList(tab = 'builtin') {
        const builtinList = document.getElementById('emoji-list');
        const favList = document.getElementById('fav-emoji-list');
        const customList = document.getElementById('custom-emoji-list');
        if (builtinList) builtinList.style.display = 'none';
        if (favList) favList.style.display = 'none';
        if (customList) customList.style.display = 'none';

        const tabs = document.querySelectorAll('#emoji-panel .tab');
        tabs.forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        if (tab === 'builtin' && builtinList) {
            builtinList.style.display = 'grid';
            builtinList.innerHTML = builtinEmojis.map(e => `<div class="emoji-item">${e}</div>`).join('');
            builtinList.querySelectorAll('.emoji-item').forEach(item => {
                item.onclick = (e) => {
                    e.stopPropagation();
                    const input = document.getElementById('chat-input');
                    if (input) input.value += item.textContent;
                };
                item.oncontextmenu = (e) => {
                    e.preventDefault();
                    if (!favEmojis.includes(item.textContent)) {
                        favEmojis.push(item.textContent);
                        localStorage.setItem('favEmojis', JSON.stringify(favEmojis));
                        alert('已添加到收藏');
                    }
                };
            });
        } else if (tab === 'fav' && favList) {
            favList.style.display = 'grid';
            favList.innerHTML = favEmojis.length ? favEmojis.map(e => `<div class="emoji-item">${e}</div>`).join('') : '<p style="grid-column: 1/9; text-align:center; padding:20px; opacity:0.5; font-size:12px">长按或右键默认表情可添加到收藏</p>';
            favList.querySelectorAll('.emoji-item').forEach(item => {
                item.onclick = (e) => {
                    e.stopPropagation();
                    const input = document.getElementById('chat-input');
                    if (input) input.value += item.textContent;
                };
            });
        } else if (tab === 'custom' && customList) {
            customList.style.display = 'grid';
            customList.innerHTML = `<div class="add-custom-emoji"><label for="emoji-upload">+</label><input type="file" id="emoji-upload" accept="image/*" style="display:none"></div>` + customEmojis.map((e, idx) => `<div class="emoji-item custom-emoji-item" data-idx="${idx}"><img src="${e}" class="emoji-img"></div>`).join('');
            const emojiUpload = document.getElementById('emoji-upload');
            if (emojiUpload) {
                emojiUpload.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            customEmojis.push(event.target.result);
                            localStorage.setItem('customEmojis', JSON.stringify(customEmojis));
                            renderEmojiList('custom');
                        };
                        reader.readAsDataURL(file);
                    }
                };
            }
            customList.querySelectorAll('.custom-emoji-item').forEach(item => {
                item.onclick = (e) => { e.stopPropagation(); sendEmoji(customEmojis[item.dataset.idx]); };
            });
        }
    }

    async function sendEmoji(imgData) {
        if (!currentChat) return;
        const msgs = safeGetItem(`msgs_${currentChat.id}`, []);
        msgs.push({ role: 'user', content: imgData, timestamp: Date.now(), type: 'image' });
        localStorage.setItem(`msgs_${currentChat.id}`, JSON.stringify(msgs));
        renderMessages();
        closePanels();
    }

    document.querySelectorAll('#emoji-panel .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#emoji-panel .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderEmojiList(tab.dataset.tab);
        });
    });

    async function callAI(messages) {
        const base = localStorage.getItem('apiBase') || 'https://api.openai.com/v1';
        const key = localStorage.getItem('apiKey');
        const model = localStorage.getItem('apiModel') || 'gpt-3.5-turbo';
        if (!key) return null;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            const response = await fetch(`${base}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                body: JSON.stringify({ model, messages }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) return null;
            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) { return null; }
    }

    // 11.1 钱包充值与账单逻辑
    const walletRechargeBtn = document.getElementById('wallet-recharge-btn');
    const rechargeModal = document.getElementById('recharge-modal');
    const closeRechargeBtn = document.getElementById('close-recharge');
    const confirmRechargeBtn = document.getElementById('confirm-recharge-btn');
    const walletBillBtn = document.getElementById('wallet-bill-btn');
    const billOverlay = document.getElementById('bill-overlay');
    const billList = document.getElementById('bill-list');
    const closeBillBtn = document.getElementById('close-bill');

    if (walletRechargeBtn) walletRechargeBtn.onclick = () => rechargeModal.classList.add('active');
    if (closeRechargeBtn) closeRechargeBtn.onclick = () => rechargeModal.classList.remove('active');
    if (confirmRechargeBtn) {
        confirmRechargeBtn.onclick = () => {
            const amountInput = document.getElementById('recharge-amount');
            const amount = parseFloat(amountInput ? amountInput.value : '0');
            if (isNaN(amount) || amount <= 0) return alert('请输入有效金额');
            addBill('充值', amount, 'income');
            if (rechargeModal) rechargeModal.classList.remove('active');
            if (amountInput) amountInput.value = '';
            alert('充值成功');
        };
    }

    if (walletBillBtn) {
        walletBillBtn.onclick = () => {
            if (billOverlay) billOverlay.classList.add('active');
            renderBillList();
        };
    }
    if (closeBillBtn) closeBillBtn.onclick = () => {
        if (billOverlay) billOverlay.classList.remove('active');
    };

    function renderBillList() {
        if (!billList) return;
        billList.innerHTML = bills.map(b => {
            const time = new Date(b.time);
            const timeStr = `${time.getMonth() + 1}月${time.getDate()}日 ${time.getHours()}:${String(time.getMinutes()).padStart(2, '0')}`;
            return `
                <div class="bill-item">
                    <div class="bill-info">
                        <h4>${b.title}</h4>
                        <p>${timeStr}</p>
                    </div>
                    <div class="bill-amount ${b.type}">${b.type === 'income' ? '+' : '-'}${b.amount.toFixed(2)}</div>
                </div>
            `;
        }).join('') || '<p style="text-align:center; padding:40px; opacity:0.5">暂无账单记录</p>';
    }

    // 16. 浏览器逻辑
    const browserUrlInput = document.getElementById('browser-url');
    const browserRefreshBtn = document.getElementById('browser-refresh-btn');
    const browserHomeBtn = document.getElementById('browser-home-btn');
    const browserLoading = document.getElementById('browser-loading-spinner');
    const browserIframeSim = document.getElementById('browser-iframe-sim');

    bindAppClick('[data-app="browser"]', browserApp, () => {
        if (browserUrlInput) loadBrowserUrl(browserUrlInput.value);
    });

    if (browserUrlInput) {
        browserUrlInput.onkeypress = (e) => {
            if (e.key === 'Enter') loadBrowserUrl(browserUrlInput.value);
        };
    }

    if (browserRefreshBtn) browserRefreshBtn.onclick = () => {
        if (browserUrlInput) loadBrowserUrl(browserUrlInput.value);
    };
    if (browserHomeBtn) browserHomeBtn.onclick = () => {
        if (browserUrlInput) {
            browserUrlInput.value = 'https://little-phone.com';
            loadBrowserUrl(browserUrlInput.value);
        }
    };

    function loadBrowserUrl(url) {
        if (!url.startsWith('http')) url = 'https://' + url;
        if (browserUrlInput) browserUrlInput.value = url;
        if (browserLoading) browserLoading.style.display = 'flex';
        if (browserIframeSim) browserIframeSim.style.display = 'none';

        setTimeout(() => {
            if (browserLoading) browserLoading.style.display = 'none';
            if (browserIframeSim) {
                browserIframeSim.style.display = 'block';
                // 模拟网页内容变化
                if (url.includes('baidu')) {
                    browserIframeSim.innerHTML = `
                        <div style="text-align:center; padding-top:50px">
                            <h2 style="color:#2d5df6">Baidu 百度</h2>
                            <input type="text" style="width:80%; padding:10px; border:1px solid #ddd; border-radius:4px; margin-top:20px">
                            <button class="primary-btn" style="width:100px; margin-top:10px">搜索</button>
                        </div>`;
                } else if (url.includes('github')) {
                    browserIframeSim.innerHTML = `
                        <div style="padding:20px">
                            <h2>GitHub</h2>
                            <p>Cline / little-phone</p>
                            <hr>
                            <div style="background:#f6f8fa; padding:10px; border-radius:6px; margin-top:10px">
                                <code>npm install ai-native-os</code>
                            </div>
                        </div>`;
                } else {
                    browserIframeSim.innerHTML = `
                        <h1>Little Phone</h1>
                        <p>欢迎来到 AI Roleplay 虚拟系统。</p>
                        <hr>
                        <ul>
                            <li><a href="#" onclick="loadSimPage('baidu')">百度一下</a></li>
                            <li><a href="#" onclick="loadSimPage('github')">开发者文档</a></li>
                        </ul>`;
                }
            }
        }, 1000);
    }

    window.loadSimPage = (page) => {
        const url = page === 'baidu' ? 'https://www.baidu.com' : 'https://github.com/cline/little-phone';
        loadBrowserUrl(url);
    };

    // 17. 商城 (Mall) 逻辑
    let shopProducts = safeGetItem('shop_products', [
        { id: 101, name: 'AI 虚拟女友专属礼物包', price: 99.00, icon: '🎁', category: '推荐' },
        { id: 102, name: '沉浸式角色扮演语音包', price: 29.00, icon: '🎙️', category: '数码' },
        { id: 103, name: '虚拟浪漫晚餐入场券', price: 199.00, icon: '🕯️', category: '美食' },
        { id: 104, name: '高拟真角色皮肤-和服', price: 59.00, icon: '👘', category: '女装' },
        { id: 105, name: '高拟真角色皮肤-西装', price: 59.00, icon: '👔', category: '男装' },
        { id: 106, name: '心情加速药水', price: 9.90, icon: '🧪', category: '超市' }
    ]);

    let cart = safeGetItem('shop_cart', []);
    let orders = safeGetItem('shop_orders', []);


    // AI 刷新货物功能
    window.aiRefreshShop = async () => {
        const btn = document.querySelector('.shop-header .header-action');
        if (btn) btn.textContent = '⌛';
        
        try {
            const prompt = "请为我的虚拟手机商城生成6个极具少女感、粉色调、二次元或可爱风格的虚拟商品。返回格式为JSON数组，包含id, name, price, icon, category。例如：[{\"id\":201, \"name\":\"粉色猫耳耳机\", \"price\":299, \"icon\":\"🎧\", \"category\":\"数码\"}]。价格在1-1000之间。分类可选：推荐、数码、美食、女装、男装、超市。";
            const response = await callAI([{ role: 'user', content: prompt }]);
            
            if (response) {
                // 尝试解析 JSON
                const match = response.match(/\[.*\]/s);
                if (match) {
                    const newProducts = JSON.parse(match[0]);
                    shopProducts = newProducts;
                    localStorage.setItem('shop_products', JSON.stringify(shopProducts));
                    renderShopProducts();
                    alert('AI 已为您刷新了一批新货！✨');
                }
            }
        } catch (e) {
            console.error('AI Refresh Shop Error:', e);
            alert('刷新失败，请检查网络或 API 设置');
        } finally {
            if (btn) btn.textContent = '✨';
        }
    };

    // 商城 Tab 切换
    document.querySelectorAll('.shop-bottom-nav .nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            switchShopTab(tab);
        });
    });

    function switchShopTab(tab) {
        document.querySelectorAll('.shop-bottom-nav .nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.shop-tab-content').forEach(c => c.classList.remove('active'));
        const navItem = document.querySelector(`.shop-bottom-nav .nav-item[data-tab="${tab}"]`);
        if (navItem) navItem.classList.add('active');
        const tabContent = document.getElementById(`shop-tab-${tab}`);
        if (tabContent) tabContent.classList.add('active');

        if (tab === 'cart') renderCart();
        if (tab === 'profile') renderShopProfile();
    }

    function renderShopProducts(category = '推荐') {
        const grid = document.getElementById('shop-product-list');
        if (!grid) return;
        
        let filtered = shopProducts;
        if (category !== '推荐') {
            filtered = shopProducts.filter(p => p.category === category);
        }

        grid.innerHTML = filtered.map(p => `
            <div class="product-card">
                <div class="product-image">${p.icon}</div>
                <div class="product-info">
                    <div class="product-name">${p.name}</div>
                    <div class="product-price-row">
                        <span class="product-price">¥${p.price.toFixed(2)}</span>
                        <button class="add-cart-btn" onclick="addToCart(${p.id})">+</button>
                    </div>
                </div>
            </div>
        `).join('');
        
        // 更新分类栏状态
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.toggle('active', item.textContent.trim() === category);
        });
    }

    // 分类点击
    document.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', () => {
            renderShopProducts(item.dataset.cat);
        });
    });

    window.addToCart = (id) => {
        const product = shopProducts.find(p => p.id === id);
        const cartItem = cart.find(item => item.id === id);
        if (cartItem) {
            cartItem.qty++;
        } else {
            cart.push({ ...product, qty: 1, selected: true });
        }
        localStorage.setItem('shop_cart', JSON.stringify(cart));
        updateCartBadge();
        alert('已加入购物车');
    };

    function updateCartBadge() {
        const badge = document.getElementById('cart-badge');
        if (badge) {
            const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
            badge.style.display = totalQty > 0 ? 'flex' : 'none';
            badge.textContent = totalQty;
        }
    }
    updateCartBadge();

    function renderCart() {
        const list = document.getElementById('cart-list');
        if (!list) return;

        if (cart.length === 0) {
            list.innerHTML = '<p style="text-align:center; padding:40px; opacity:0.5">购物车空空如也</p>';
            const totalPrice = document.getElementById('cart-total-price');
            if (totalPrice) totalPrice.textContent = '¥0.00';
            return;
        }

        list.innerHTML = cart.map((item, idx) => `
            <div class="cart-item">
                <input type="checkbox" class="cart-item-checkbox" ${item.selected ? 'checked' : ''} onchange="toggleCartItem(${idx})">
                <div class="cart-item-image">${item.icon}</div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price-row">
                        <span class="product-price">¥${item.price.toFixed(2)}</span>
                        <div class="cart-quantity-control">
                            <button class="qty-btn" onclick="changeCartQty(${idx}, -1)">-</button>
                            <span class="qty-val">${item.qty}</span>
                            <button class="qty-btn" onclick="changeCartQty(${idx}, 1)">+</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        calculateCartTotal();
    }

    window.toggleCartItem = (idx) => {
        cart[idx].selected = !cart[idx].selected;
        calculateCartTotal();
    };

    window.changeCartQty = (idx, delta) => {
        cart[idx].qty += delta;
        if (cart[idx].qty <= 0) {
            cart.splice(idx, 1);
        }
        localStorage.setItem('shop_cart', JSON.stringify(cart));
        renderCart();
        updateCartBadge();
    };

    function calculateCartTotal() {
        const total = cart.filter(item => item.selected).reduce((sum, item) => sum + item.price * item.qty, 0);
        const totalPrice = document.getElementById('cart-total-price');
        if (totalPrice) totalPrice.textContent = total.toFixed(2);
    }

    // 去结算
    const goCheckoutBtn = document.getElementById('cart-checkout-btn');
    if (goCheckoutBtn) {
        goCheckoutBtn.onclick = () => {
            const selectedItems = cart.filter(item => item.selected);
            if (selectedItems.length === 0) return alert('请选择要结算的商品');
            
            const checkoutPage = document.getElementById('checkout-overlay');
            const checkoutList = document.getElementById('checkout-items');
            const checkoutTotal = document.getElementById('checkout-total-price');
            const finalAmount = document.getElementById('checkout-final-amount');
            
            if (checkoutList) {
                checkoutList.innerHTML = selectedItems.map(item => `
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:14px">
                        <span>${item.name} x${item.qty}</span>
                        <span style="font-weight:600">¥${(item.price * item.qty).toFixed(2)}</span>
                    </div>
                `).join('');
            }
            
            const total = selectedItems.reduce((sum, item) => sum + item.price * item.qty, 0);
            const totalStr = `¥${total.toFixed(2)}`;
            if (checkoutTotal) checkoutTotal.textContent = totalStr;
            if (finalAmount) finalAmount.textContent = totalStr;
            if (checkoutPage) checkoutPage.classList.add('active');
        };
    }

    const backToCartBtn = document.getElementById('close-checkout');
    if (backToCartBtn) {
        backToCartBtn.onclick = () => {
            document.getElementById('checkout-overlay').classList.remove('active');
        };
    }

    // 支付按钮
    const payOrderBtn = document.getElementById('confirm-pay-btn');
    if (payOrderBtn) {
        payOrderBtn.onclick = () => {
            const selectedItems = cart.filter(item => item.selected);
            const total = selectedItems.reduce((sum, item) => sum + item.price * item.qty, 0);
            
            if (total > walletBalance) return alert('余额不足，请先充值');
            
            // 生成订单
            const order = {
                id: 'ORD' + Date.now(),
                items: [...selectedItems],
                total: total,
                status: 'pending', // 待收货
                time: Date.now()
            };
            orders.unshift(order);
            localStorage.setItem('shop_orders', JSON.stringify(orders));
            
            // 扣款
            addBill('商城消费', total, 'expense');
            
            // 清理购物车已买商品
            cart = cart.filter(item => !item.selected);
            localStorage.setItem('shop_cart', JSON.stringify(cart));
            updateCartBadge();
            
            alert('支付成功！');
            document.getElementById('checkout-overlay').classList.remove('active');
            switchShopTab('profile');
            renderOrders('pending');
        };
    }

    function renderShopProfile() {
        // 更新待收货、待发货等角标
        const pendingBadge = document.getElementById('badge-pending');
        const shipBadge = document.getElementById('badge-shipping');
        const ratingBadge = document.getElementById('badge-rating');
        
        const pendingCount = orders.filter(o => o.status === 'pending').length;
        const shipCount = orders.filter(o => o.status === 'shipping').length;
        const ratingCount = orders.filter(o => o.status === 'completed' && !o.rated).length;

        if (pendingBadge) {
            pendingBadge.style.display = pendingCount > 0 ? 'flex' : 'none';
            pendingBadge.textContent = pendingCount;
        }
        if (shipBadge) {
            shipBadge.style.display = shipCount > 0 ? 'flex' : 'none';
            shipBadge.textContent = shipCount;
        }
        if (ratingBadge) {
            ratingBadge.style.display = ratingCount > 0 ? 'flex' : 'none';
            ratingBadge.textContent = ratingCount;
        }
    }

    function renderOrders(statusFilter = 'all') {
        const list = document.getElementById('shop-order-items');
        if (!list) return;

        let filtered = orders;
        if (statusFilter !== 'all') {
            filtered = orders.filter(o => o.status === statusFilter);
        }

        if (filtered.length === 0) {
            list.innerHTML = '<p style="text-align:center; padding:40px; opacity:0.5">暂无相关订单</p>';
            return;
        }

        const statusMap = {
            'pending': '待收货',
            'shipping': '待发货',
            'completed': '已完成',
            'rating': '待评价',
            'aftersale': '售后中'
        };

        list.innerHTML = filtered.map(o => `
            <div class="order-card">
                <div class="order-header">
                    <span>订单号: ${o.id}</span>
                    <span class="order-status">${statusMap[o.status] || o.status}</span>
                </div>
                ${o.items.map(item => `
                    <div class="order-item-mini">
                        <div class="thumb">${item.icon}</div>
                        <div class="info">
                            <div style="font-size:14px; font-weight:500">${item.name}</div>
                            <div style="font-size:12px; opacity:0.5">¥${item.price.toFixed(2)} x${item.qty}</div>
                        </div>
                    </div>
                `).join('')}
                <div style="text-align:right; font-weight:600; font-size:14px; margin:10px 0">
                    实付款: <span style="color:var(--brand-color)">¥${o.total.toFixed(2)}</span>
                </div>
                <div class="order-footer">
                    ${o.status === 'pending' ? `
                        <button class="order-btn" onclick="applyAfterSales('${o.id}')">申请售后</button>
                        <button class="order-btn primary" onclick="confirmOrderReceipt('${o.id}')">确认收货</button>
                    ` : ''}
                    ${o.status === 'completed' && !o.rated ? `
                        <button class="order-btn primary" onclick="openRatingModal('${o.id}')">评价</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    window.confirmOrderReceipt = (id) => {
        const order = orders.find(o => o.id === id);
        if (order) {
            order.status = 'completed';
            localStorage.setItem('shop_orders', JSON.stringify(orders));
            renderOrders('pending');
            renderShopProfile();
        }
    };

    // 订单列表导航
    document.querySelectorAll('.order-nav-item').forEach(item => {
        item.onclick = () => openOrderListPage(item.dataset.status);
    });

    function openOrderListPage(status) {
        const ordersPage = document.getElementById('order-list-overlay');
        const titleEl = document.getElementById('order-list-title');
        const statusMap = {
            'pending': '待收货',
            'shipping': '待发货',
            'completed': '已完成',
            'rating': '待评价',
            'aftersale': '售后中'
        };
        if (titleEl) titleEl.textContent = statusMap[status] || '订单管理';
        if (ordersPage) ordersPage.classList.add('active');
        renderOrders(status);
    }

    const closeOrderListBtn = document.getElementById('close-order-list');
    if (closeOrderListBtn) {
        closeOrderListBtn.onclick = () => {
            document.getElementById('order-list-overlay').classList.remove('active');
        };
    }

    // 评价逻辑
    let currentRatingOrderId = null;
    window.openRatingModal = (id) => {
        currentRatingOrderId = id;
        const ratingModal = document.getElementById('rating-modal');
        if (ratingModal) ratingModal.classList.add('active');
    };

    document.querySelectorAll('.star').forEach(star => {
        star.onclick = () => {
            const val = parseInt(star.dataset.value);
            document.querySelectorAll('.star').forEach(s => {
                s.classList.toggle('active', parseInt(s.dataset.value) <= val);
            });
        };
    });

    const submitRatingBtn = document.getElementById('submit-rating');
    if (submitRatingBtn) {
        submitRatingBtn.onclick = () => {
            const order = orders.find(o => o.id === currentRatingOrderId);
            if (order) {
                order.rated = true;
                localStorage.setItem('shop_orders', JSON.stringify(orders));
                alert('评价成功，感谢您的支持！');
                document.getElementById('rating-modal').classList.remove('active');
                renderOrders('completed');
                renderShopProfile();
            }
        };
    }

    const closeRatingModal = document.getElementById('cancel-rating');
    if (closeRatingModal) {
        closeRatingModal.onclick = () => {
            document.getElementById('rating-modal').classList.remove('active');
        };
    }

    // 售后逻辑
    let currentAsOrderId = null;
    window.applyAfterSales = (id) => {
        currentAsOrderId = id;
        const asModal = document.getElementById('aftersale-modal');
        if (asModal) asModal.classList.add('active');
    };

    const submitAsBtn = document.getElementById('confirm-aftersale');
    if (submitAsBtn) {
        submitAsBtn.onclick = () => {
            const order = orders.find(o => o.id === currentAsOrderId);
            if (order) {
                order.status = 'aftersale';
                localStorage.setItem('shop_orders', JSON.stringify(orders));
                alert('售后申请已提交，请耐心等待 AI 客服处理。');
                document.getElementById('aftersale-modal').classList.remove('active');
                renderOrders('pending');
                renderShopProfile();
            }
        };
    }

    const closeAsModal = document.getElementById('cancel-aftersale');
    if (closeAsModal) {
        closeAsModal.onclick = () => {
            document.getElementById('aftersale-modal').classList.remove('active');
        };
    }

    // 18. 角色手机查看逻辑
    function getRolePhoneData(charId) {
        let phoneData = safeGetItem(`role_phone_${charId}`, null);
        if (!phoneData) {
            phoneData = generateMockPhoneData();
            localStorage.setItem(`role_phone_${charId}`, JSON.stringify(phoneData));
        }
        return phoneData;
    }

    function generateMockPhoneData() {
        const apps = ['微信', '小红书', '抖音', '王者荣耀', '网易云音乐', '淘宝', '哔哩哔哩', '相册', '浏览器'];
        const rankings = apps.sort(() => Math.random() - 0.5).slice(0, 5).map(app => ({
            name: app,
            time: (Math.random() * 5 + 0.5).toFixed(1) + 'h'
        }));
        const history = ['如何给猫咪剪指甲', '附近好吃的甜品店', '最近好看的电视剧推荐', 'Quicksand 字体下载'].sort(() => Math.random() - 0.5).slice(0, 4);
        const notes = ['明天记得买牛奶', '下周六小美生日', '要准备的项目资料'].sort(() => Math.random() - 0.5).slice(0, 3);
        const bills = [{ title: '全家便利店', amount: -15.5 }, { title: '转账收款', amount: 200.0 }, { title: '美团外卖', amount: -32.0 }];
        return { usageTotal: (Math.random() * 8 + 2).toFixed(1) + 'h', rankings, history, notes, bills };
    }

    function renderRolePhone(char) {
        const data = getRolePhoneData(char.id);
        const ownerEl = document.getElementById('role-phone-owner');
        const usageEl = document.getElementById('role-phone-usage-total');
        if (ownerEl) ownerEl.textContent = `${char.name} 的手机`;
        if (usageEl) usageEl.textContent = data.usageTotal;
        const rankList = document.getElementById('role-phone-app-ranking');
        if (rankList) rankList.innerHTML = data.rankings.map(r => `<div class="ranking-item"><span>${r.name}</span><span style="opacity:0.6">${r.time}</span></div>`).join('');
        const historyList = document.getElementById('role-phone-browser-history');
        if (historyList) historyList.innerHTML = data.history.map(h => `<div class="history-item"><span>${h}</span><span style="opacity:0.3">🌐</span></div>`).join('');
        const notesList = document.getElementById('role-phone-notes');
        if (notesList) notesList.innerHTML = data.notes.map(n => `<div class="note-item"><span>${n}</span><span style="opacity:0.3">📝</span></div>`).join('');
        const billsList = document.getElementById('role-phone-bills');
        if (billsList) billsList.innerHTML = data.bills.map(b => `<div class="bill-mini-item"><span>${b.title}</span><span style="color:${b.amount > 0 ? '#07c160' : '#333'}">${b.amount > 0 ? '+' : ''}${b.amount}</span></div>`).join('');
        const overlay = document.getElementById('role-phone-overlay');
        if (overlay) overlay.classList.add('active');
    }

    const viewRolePhoneBtn = document.getElementById('view-role-phone-btn');
    if (viewRolePhoneBtn) {
        viewRolePhoneBtn.onclick = () => {
            if (currentChat && currentChat.type === 'group') alert('群聊暂不支持查看手机数据');
            else if (currentChat) renderRolePhone(currentChat);
        };
    }

    const closeRolePhoneBtn = document.getElementById('close-role-phone');
    if (closeRolePhoneBtn) {
        closeRolePhoneBtn.onclick = () => document.getElementById('role-phone-overlay').classList.remove('active');
    }

    const aiRefreshPhoneBtn = document.getElementById('ai-refresh-phone-data');
    if (aiRefreshPhoneBtn) {
        aiRefreshPhoneBtn.onclick = async () => {
            if (!currentChat) return;
            aiRefreshPhoneBtn.textContent = '⌛';
            try {
                const prompt = `你是 ${currentChat.name}。性格：${currentChat.bio}。生成手机数据(JSON)：usageTotal, rankings(3-5个{name,time}), history(3-5条), notes(2-3条), bills(2-3个{title,amount})。符合人设。`;
                const response = await callAI([{ role: 'user', content: prompt }]);
                if (response) {
                    const match = response.match(/\{.*\}/s);
                    if (match) {
                        localStorage.setItem(`role_phone_${currentChat.id}`, match[0]);
                        renderRolePhone(currentChat);
                        alert('数据已刷新！🪄');
                    }
                }
            } catch (e) { alert('刷新失败'); } finally { aiRefreshPhoneBtn.textContent = '🪄'; }
        };
    }

    // 19. 小红书 (XHS) 逻辑
    let xhsNotes = safeGetItem('xhs_notes', [
        { id: 1, author: '甜心小猫', avatar: '🐱', title: '今日份粉色系穿搭分享，这也太少女心了吧！', likes: 1205, images: ['🌸'], content: '今天天气超好，选了一套粉色的裙子，感觉整个人都变温柔了。', date: '04-25', comments: [] },
        { id: 2, author: '极客少女', avatar: '💻', title: '虚拟手机 OS 深度评测：AI 角色竟然会主动发朋友圈？', likes: 890, images: ['📱'], content: '最近在玩这个 Little Phone，沉浸感太强了，AI 角色的性格设定非常真实。', date: '04-24', comments: [] }
    ]);


    // AI 刷新小红书笔记
    const aiRefreshXhsBtn = document.getElementById('ai-refresh-xhs-btn');
    if (aiRefreshXhsBtn) {
        aiRefreshXhsBtn.onclick = async () => {
            aiRefreshXhsBtn.textContent = '⌛';
            try {
                const prompt = "请为我的虚拟小红书生成3条极具生活感、少女感或二次元风格的笔记。返回格式为JSON数组，包含id, author, avatar, title, likes, images(1个emoji), content, date(格式MM-DD)。例如：[{\"id\":301, \"author\":\"猫猫酱\", \"avatar\":\"🐱\", \"title\":\"今天也是元气满满的一天\", \"likes\":520, \"images\":[\"☀️\"], \"content\":\"早起看到窗外的阳光，心情瞬间变好啦！\", \"date\":\"04-25\"}]。内容要符合年轻女孩的口吻。";
                const response = await callAI([{ role: 'user', content: prompt }]);
                
                if (response) {
                    const match = response.match(/\[.*\]/s);
                    if (match) {
                        const newNotes = JSON.parse(match[0]);
                        // 将新笔记插入到最前面
                        xhsNotes = [...newNotes, ...xhsNotes];
                        // 保持最多 20 条记录
                        if (xhsNotes.length > 20) xhsNotes = xhsNotes.slice(0, 20);
                        localStorage.setItem('xhs_notes', JSON.stringify(xhsNotes));
                        renderXhsNotes();
                        alert('小红书内容已刷新！✨');
                    }
                }
            } catch (e) {
                console.error('AI Refresh XHS Error:', e);
                alert('刷新失败，请检查网络或 API 设置');
            } finally {
                aiRefreshXhsBtn.textContent = '🪄';
            }
        };
    }

    // 小红书底部导航
    document.querySelectorAll('.xhs-bottom-nav .nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            if (view === 'post') {
                document.getElementById('xhs-post-modal').classList.add('active');
            } else {
                switchXhsView(view);
            }
        });
    });

    function switchXhsView(view) {
        document.querySelectorAll('.xhs-bottom-nav .nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.xhs-view').forEach(v => v.classList.remove('active'));
        
        const navItem = document.querySelector(`.xhs-bottom-nav .nav-item[data-view="${view}"]`);
        if (navItem) navItem.classList.add('active');
        const viewEl = document.getElementById(`xhs-${view}-view`);
        if (viewEl) viewEl.classList.add('active');

        if (view === 'main') renderXhsNotes();
        if (view === 'market') renderXhsMarket();
        if (view === 'message') renderXhsMessages();
        if (view === 'profile') renderXhsProfile();
    }

    function renderXhsNotes() {
        const feed = document.getElementById('xhs-note-feed');
        if (!feed) return;
        feed.innerHTML = xhsNotes.map(n => `
            <div class="xhs-note-card" onclick="openXhsNoteDetail(${n.id})">
                <div class="xhs-note-cover" style="display:flex; align-items:center; justify-content:center; font-size:40px;">${n.images[0]}</div>
                <div class="xhs-note-info">
                    <div class="xhs-note-title">${n.title}</div>
                    <div class="xhs-note-author">
                        <span class="avatar">${n.avatar}</span>
                        <span>${n.author}</span>
                        <span class="xhs-note-likes">❤️ ${n.likes}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    window.openXhsNoteDetail = (id) => {
        const note = xhsNotes.find(n => n.id === id);
        if (!note) return;
        const detail = document.getElementById('xhs-note-detail');
        detail.querySelector('.author-name').textContent = note.author;
        detail.querySelector('.author-avatar').textContent = note.avatar;
        detail.querySelector('.note-title').textContent = note.title;
        detail.querySelector('.note-desc').textContent = note.content;
        detail.querySelector('.note-date').textContent = note.date;
        detail.querySelector('.xhs-note-images').innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:80px; background:#f0f0f0;">${note.images[0]}</div>`;
        detail.classList.add('active');

        const closeBtn = detail.querySelector('.close-btn');
        closeBtn.onclick = () => detail.classList.remove('active');
    };

    function renderXhsMarket() {
        const feed = document.getElementById('xhs-market-feed');
        if (!feed) return;
        feed.innerHTML = shopProducts.map(p => `
            <div class="product-card" style="background:white; border-radius:8px; margin:5px;">
                <div class="product-image" style="background:#f9f9f9; aspect-ratio:1;">${p.icon}</div>
                <div class="product-info">
                    <div class="product-name" style="font-size:12px;">${p.name}</div>
                    <div class="product-price" style="color:#ff2442; font-weight:700;">¥${p.price.toFixed(2)}</div>
                </div>
            </div>
        `).join('');
    }

    function renderXhsMessages() {
        const list = document.getElementById('xhs-msg-list');
        if (!list) return;
        list.innerHTML = contacts.filter(c => c.type === 'contact').map(c => `
            <div class="xhs-msg-item" onclick="openXhsChat(${c.id})">
                <div class="xhs-msg-avatar" style="display:flex; align-items:center; justify-content:center; font-size:24px;">${c.avatar.startsWith('data:image') ? `<img src="${c.avatar}">` : c.avatar}</div>
                <div class="xhs-msg-info">
                    <h4>${c.name}</h4>
                    <p>${c.lastMsg}</p>
                </div>
            </div>
        `).join('');
    }

    window.openXhsChat = (id) => {
        const contact = contacts.find(c => c.id === id);
        if (!contact) return;
        const chatWindow = document.getElementById('xhs-chat-window');
        chatWindow.querySelector('.xhs-chat-name').textContent = contact.name;
        chatWindow.classList.add('active');

        const msgs = safeGetItem(`msgs_${id}`, []);
        const msgContainer = chatWindow.querySelector('.xhs-chat-messages');
        msgContainer.innerHTML = msgs.map(m => `
            <div class="message-wrapper ${m.role === 'user' ? 'sent' : 'received'}">
                <div class="message ${m.role === 'user' ? 'sent' : 'received'}" style="${m.role === 'user' ? 'background:#ff2442; color:white;' : ''}">
                    ${m.content}
                </div>
            </div>
        `).join('');

        const closeBtn = chatWindow.querySelector('.close-btn');
        closeBtn.onclick = () => chatWindow.classList.remove('active');
    };

    function renderXhsProfile() {
        const nickname = document.getElementById('xhs-user-nickname');
        const avatar = document.querySelector('.xhs-user-info .xhs-user-avatar');
        if (nickname) nickname.textContent = myProfile.nickname;
        if (avatar) avatar.textContent = myProfile.avatar.startsWith('data:image') ? '' : myProfile.avatar;
        if (avatar && myProfile.avatar.startsWith('data:image')) {
            avatar.innerHTML = `<img src="${myProfile.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        }

        const profileFeed = document.getElementById('xhs-profile-feed');
        if (profileFeed) {
            const myNotes = xhsNotes.filter(n => n.author === myProfile.nickname);
            profileFeed.innerHTML = myNotes.length ? myNotes.map(n => `
                <div class="xhs-note-card">
                    <div class="xhs-note-cover" style="display:flex; align-items:center; justify-content:center; font-size:40px;">${n.images[0]}</div>
                    <div class="xhs-note-info">
                        <div class="xhs-note-title">${n.title}</div>
                    </div>
                </div>
            `).join('') : '<p style="grid-column:1/3; text-align:center; padding:20px; opacity:0.5;">还没有发布过笔记哦</p>';
        }
    }

    const xhsSubmitPost = document.getElementById('xhs-submit-post');
    if (xhsSubmitPost) {
        xhsSubmitPost.onclick = () => {
            const title = document.getElementById('xhs-post-title').value.trim();
            const desc = document.getElementById('xhs-post-desc').value.trim();
            if (!title) return alert('请输入标题');

            const newNote = {
                id: Date.now(),
                author: myProfile.nickname,
                avatar: myProfile.avatar.startsWith('data:image') ? '👤' : myProfile.avatar,
                title: title,
                content: desc,
                likes: 0,
                images: ['📝'],
                date: '04-25',
                comments: []
            };
            xhsNotes.unshift(newNote);
            localStorage.setItem('xhs_notes', JSON.stringify(xhsNotes));
            document.getElementById('xhs-post-modal').classList.remove('active');
            document.getElementById('xhs-post-title').value = '';
            document.getElementById('xhs-post-desc').value = '';
            renderXhsNotes();
            alert('发布成功！');
        };
    }

    const xhsPostClose = document.querySelector('#xhs-post-modal .close-btn');
    if (xhsPostClose) {
        xhsPostClose.onclick = () => document.getElementById('xhs-post-modal').classList.remove('active');
    }

    // --- 线下剧本模式核心逻辑 ---

    function openRPAdvancedSettings() {
        const overlay = document.getElementById('rp-adv-settings-overlay');
        if (!overlay) return;

        // 加载当前设置到 UI
        document.getElementById('rp-word-count').value = rpSettings.wordCount;
        document.getElementById('rp-word-count-val').textContent = rpSettings.wordCount + '字';
        document.getElementById('rp-perspective').value = rpSettings.perspective;
        document.getElementById('rp-initiative').value = rpSettings.initiative;
        document.getElementById('rp-dialogue-ratio').value = rpSettings.dialogueRatio;
        document.getElementById('rp-desc-ratio').value = rpSettings.descRatio;
        document.getElementById('rp-rhetoric-density').value = rpSettings.rhetoricDensity;
        document.querySelector(`input[name="rp-tempo"][value="${rpSettings.tempo}"]`).checked = true;
        document.getElementById('rp-style-prompt').value = rpSettings.stylePrompt;
        document.getElementById('rp-forbidden-words').value = rpSettings.forbiddenWords;
        document.getElementById('rp-current-scene').value = rpSettings.currentScene;
        document.getElementById('rp-current-atmosphere').value = rpSettings.currentAtmosphere;

        overlay.classList.add('active');
    }

    const saveRPAdvBtn = document.getElementById('save-rp-adv');
    if (saveRPAdvBtn) {
        saveRPAdvBtn.onclick = () => {
            rpSettings.wordCount = parseInt(document.getElementById('rp-word-count').value);
            rpSettings.perspective = document.getElementById('rp-perspective').value;
            rpSettings.initiative = document.getElementById('rp-initiative').value;
            rpSettings.dialogueRatio = parseInt(document.getElementById('rp-dialogue-ratio').value);
            rpSettings.descRatio = parseInt(document.getElementById('rp-desc-ratio').value);
            rpSettings.rhetoricDensity = parseInt(document.getElementById('rp-rhetoric-density').value);
            rpSettings.tempo = document.querySelector('input[name="rp-tempo"]:checked').value;
            rpSettings.stylePrompt = document.getElementById('rp-style-prompt').value;
            rpSettings.forbiddenWords = document.getElementById('rp-forbidden-words').value;
            rpSettings.currentScene = document.getElementById('rp-current-scene').value;
            rpSettings.currentAtmosphere = document.getElementById('rp-current-atmosphere').value;

            localStorage.setItem('rpSettings', JSON.stringify(rpSettings));
            document.getElementById('rp-adv-settings-overlay').classList.remove('active');
            updateRPModeUI();
        };
    }

    const closeRPAdvBtn = document.getElementById('close-rp-adv');
    if (closeRPAdvBtn) {
        closeRPAdvBtn.onclick = () => document.getElementById('rp-adv-settings-overlay').classList.remove('active');
    }

    const rpWordCountInput = document.getElementById('rp-word-count');
    if (rpWordCountInput) {
        rpWordCountInput.oninput = () => {
            document.getElementById('rp-word-count-val').textContent = rpWordCountInput.value + '字';
        };
    }

    // 写作模式按钮绑定
    document.querySelectorAll('.writing-mode-btn[data-mode]').forEach(btn => {
        btn.onclick = () => {
            const mode = btn.dataset.mode;
            document.querySelectorAll('.writing-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentWritingMode = mode;

            // 导演模式特有 UI
            const directorBar = document.getElementById('director-command-bar');
            if (directorBar) directorBar.style.display = (mode === 'director') ? 'flex' : 'none';
            
            // 如果是续写、润色、灵感，直接触发 AI (如果输入框有内容或模式允许)
            if (mode !== 'director') {
                triggerRPResponse(mode);
            }
        };
    });

    const openRPAdvIcon = document.getElementById('open-rp-adv-settings');
    if (openRPAdvIcon) openRPAdvIcon.onclick = openRPAdvancedSettings;

    // 导演模式快速指令
    document.querySelectorAll('.cmd-chip').forEach(chip => {
        chip.onclick = () => {
            const cmd = chip.dataset.cmd;
            const input = document.getElementById('chat-input');
            if (input) {
                input.value = cmd;
                triggerRPResponse('director');
            }
        };
    });

    async function triggerRPResponse(mode, extraContext = '') {
        if (!currentChat) return;
        const typingStatus = document.getElementById('typing-status');
        const input = document.getElementById('chat-input');
        const userCommand = input.value.trim();
        const chatId = currentChat.id;

        if (typingStatus) typingStatus.style.display = 'block';

        try {
            const msgs = safeGetItem(`msgs_${chatId}`, []);
            
            // 构建 RP 专用 System Prompt
            let rpPrompt = `你是专业写作助手/角色扮演 AI。当前角色：${currentChat.name}。
设定：${currentChat.bio}。
场景：${rpSettings.currentScene}。
氛围：${rpSettings.currentAtmosphere}。
文风要求：对白约${rpSettings.dialogueRatio}%，描写约${rpSettings.descRatio}%，修辞密度${rpSettings.rhetoricDensity}%。
视角：${rpSettings.perspective}。节奏：${rpSettings.tempo}。
字数：请回复大约 ${rpSettings.wordCount} 字。
风格加强：${rpSettings.stylePrompt}。
禁忌：不要提到 ${rpSettings.forbiddenWords}。

模式指令 [${mode.toUpperCase()}]:
`;
            if (mode === 'director') {
                rpPrompt += `用户是导演，提供了指令："${userCommand}"。请根据指令生成一段包含对话、动作、环境描写的精彩剧情文本。不要跳戏，直接输出剧情内容。`;
                if (userCommand) {
                    msgs.push({ role: 'user', content: userCommand, timestamp: Date.now(), isRP: true });
                    input.value = '';
                }
            } else if (mode === 'continue') {
                rpPrompt += `请根据当前剧情逻辑进行续写，保持文风一致，推进情节。不要修改原文。`;
            } else if (mode === 'polish') {
                const lastMsg = msgs.slice(-1)[0]?.content || '';
                rpPrompt += `请对以下文本进行润色优化，提升文采和沉浸感，保持原意：\n"${lastMsg}"`;
            } else if (mode === 'inspire') {
                rpPrompt += `请根据当前设定和场景，自由发挥生成一段能推进剧情、充满张力的角色回复。`;
            }

            const contextMsgs = [
                { role: 'system', content: rpPrompt },
                ...msgs.slice(-8).map(m => ({ role: m.role, content: m.content }))
            ];

            const response = await callAI(contextMsgs);
            if (response && currentChat && currentChat.id === chatId) {
                const latestMsgs = safeGetItem(`msgs_${chatId}`, []);
                latestMsgs.push({ 
                    role: 'assistant', 
                    content: response, 
                    timestamp: Date.now(),
                    isRP: true 
                });
                localStorage.setItem(`msgs_${chatId}`, JSON.stringify(latestMsgs));
                
                currentChat.lastMsg = response.substring(0, 30) + '...';
                currentChat.lastTime = Date.now();
                localStorage.setItem('contacts', JSON.stringify(contacts));
                
                renderMessages();
                renderContacts();
            }
        } finally {
            if (typingStatus) typingStatus.style.display = 'none';
        }
    }

    // 消息右键/长按菜单逻辑
    let activeMsgIdx = null;
    window.showMsgActionMenu = (e, idx) => {
        e.preventDefault();
        e.stopPropagation();
        activeMsgIdx = idx;
        const menu = document.getElementById('msg-action-menu');
        if (!menu) return;

        menu.style.display = 'block';
        menu.style.left = Math.min(e.pageX, window.innerWidth - 160) + 'px';
        menu.style.top = Math.min(e.pageY, window.innerHeight - 200) + 'px';

        const hideMenu = () => {
            menu.style.display = 'none';
            document.removeEventListener('click', hideMenu);
        };
        setTimeout(() => document.addEventListener('click', hideMenu), 10);
    };

    document.querySelectorAll('.msg-action-menu .menu-item').forEach(item => {
        item.onclick = (e) => {
            const action = item.dataset.action;
            const msgs = safeGetItem(`msgs_${currentChat.id}`, []);
            
            if (action === 'rollback') {
                if (confirm('确定要删除此条及之后的消息，重回到此处吗？')) {
                    const newMsgs = msgs.slice(0, activeMsgIdx + 1);
                    localStorage.setItem(`msgs_${currentChat.id}`, JSON.stringify(newMsgs));
                    renderMessages();
                }
            } else if (action === 'modify') {
                const newContent = prompt('修改消息内容：', msgs[activeMsgIdx].content);
                if (newContent !== null) {
                    msgs[activeMsgIdx].content = newContent;
                    localStorage.setItem(`msgs_${currentChat.id}`, JSON.stringify(msgs));
                    renderMessages();
                }
            } else if (action === 'branch') {
                alert('分支剧情功能：已基于此条消息开启平行时空（逻辑占位）');
            } else if (action === 'copy') {
                navigator.clipboard.writeText(msgs[activeMsgIdx].content);
                alert('已复制');
            }
        };
    });

    updateWalletUI();
});
