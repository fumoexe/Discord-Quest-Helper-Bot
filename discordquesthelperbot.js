(async () => {
    try {
        // ------------------------------
        // Cute Modern Launch Overlay (Script by Mowa)
        // ------------------------------
        const showLaunchOverlay = () => {
            const overlayWrap = document.createElement("div");
            overlayWrap.id = "mowa-overlay-wrap";
            Object.assign(overlayWrap.style, {
                position: "fixed",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 2147483647
            });

            const box = document.createElement("div");
            box.id = "mowa-overlay";
            box.innerHTML = `
                <div style="display:flex;align-items:center;gap:14px;">
                    <img src="https://media1.tenor.com/m/yry9zYk-JwoAAAAC/meow-dancing-cat.gif" 
                         style="width:56px;height:56px;border-radius:12px;background:rgba(255,255,255,0.15);backdrop-filter:blur(6px);box-shadow:0 6px 20px rgba(0,0,0,0.25);"/>
                    <div style="text-align:left;line-height:1.05;">
                        <div style="font-weight:800;font-size:18px;">Script by Mowa</div>
                        <div style="opacity:0.9;font-size:13px;margin-top:4px;">Now spoofing quests — running in background</div>
                    </div>
                </div>
            `;
            Object.assign(box.style, {
                pointerEvents: "auto",
                padding: "18px 22px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, rgba(255,154,158,0.95), rgba(250,208,196,0.95))",
                color: "#ffffff",
                boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
                transform: "translateY(-10px)",
                transition: "all 420ms cubic-bezier(.2,.9,.2,1)",
                cursor: "grab",
                userSelect: "none",
                minWidth: "320px",
                maxWidth: "90vw",
            });

            overlayWrap.appendChild(box);
            document.body.appendChild(overlayWrap);

            // Dragging
            let dragging = false, offsetX = 0, offsetY = 0;
            box.addEventListener("mousedown", e => {
                dragging = true;
                offsetX = e.clientX - box.getBoundingClientRect().left;
                offsetY = e.clientY - box.getBoundingClientRect().top;
                box.style.cursor = "grabbing";
            });
            const onUp = () => { dragging = false; box.style.cursor = "grab"; };
            const onMove = (e) => {
                if (!dragging) return;
                box.style.position = "fixed";
                box.style.left = Math.max(8, Math.min(window.innerWidth - box.offsetWidth - 8, e.clientX - offsetX)) + "px";
                box.style.top = Math.max(8, Math.min(window.innerHeight - box.offsetHeight - 8, e.clientY - offsetY)) + "px";
                box.style.transform = "none";
            };
            document.addEventListener("mouseup", onUp);
            document.addEventListener("mousemove", onMove);

            // Auto fade out after 4s, but keep dismissible on click
            const removeOverlay = () => {
                try {
                    box.style.transition = "opacity 600ms ease, transform 600ms ease";
                    box.style.opacity = 0;
                    box.style.transform = "scale(0.96) translateY(6px)";
                    setTimeout(() => overlayWrap.remove(), 650);
                } catch (e) { /* ignore */ }
            };
            box.addEventListener("click", removeOverlay);
            setTimeout(removeOverlay, 4000);
        };

        showLaunchOverlay();

        // ------------------------------
        // Webpack & Discord internals
        // ------------------------------
        delete window.$;
        let wpRequire = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
        webpackChunkdiscord_app.pop();
        const getModule = (check) => Object.values(wpRequire.c).find(check)?.exports;

        const ApplicationStreamingStore = getModule(x => x?.exports?.Z?.__proto__?.getStreamerActiveStreamMetadata)?.Z;
        const RunningGameStore = getModule(x => x?.exports?.ZP?.getRunningGames)?.ZP;
        const QuestsStore = getModule(x => x?.exports?.Z?.__proto__?.getQuest)?.Z;
        const ChannelStore = getModule(x => x?.exports?.Z?.__proto__?.getAllThreadsForParent)?.Z;
        const GuildChannelStore = getModule(x => x?.exports?.ZP?.getSFWDefaultChannel)?.ZP;
        const FluxDispatcher = getModule(x => x?.exports?.Z?.__proto__?.flushWaitQueue)?.Z;
        const api = getModule(x => x?.exports?.tn?.get)?.tn;

        if (!QuestsStore || !api) {
            console.warn("Required Discord internals not found — aborting.");
            return;
        }

        // ------------------------------
        // Timer Management (stacked, draggable)
        // ------------------------------
        const activeTimers = {};
        const updateTimerPositions = () => {
            const keys = Object.keys(activeTimers);
            keys.forEach((k, i) => {
                const item = activeTimers[k];
                item.box.style.top = `${30 + i * 58}px`;
            });
        };

        const createQuestTimer = (id, label, seconds) => {
            if (activeTimers[id]) return; // prevent duplicate
            const box = document.createElement("div");
            box.id = `quest-timer-${id}`;
            Object.assign(box.style, {
                position: "fixed",
                left: "10px",
                top: `${30 + Object.keys(activeTimers).length * 58}px`,
                background: "#2f3136",
                color: "#fff",
                padding: "8px 12px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "700",
                zIndex: 999999,
                boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
                cursor: "move",
                userSelect: "none",
                minWidth: "160px",
                display: "flex",
                alignItems: "center",
                gap: "10px"
            });

            const labelEl = document.createElement("div");
            labelEl.style.flex = "1";
            labelEl.innerText = `⏳ ${label}: ${seconds}s`;

            const closeBtn = document.createElement("button");
            closeBtn.innerText = "✕";
            Object.assign(closeBtn.style, {
                background: "transparent",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                fontSize: "12px",
                padding: "4px",
            });
            closeBtn.addEventListener("click", () => {
                clearInterval(interval);
                box.remove();
                delete activeTimers[id];
                updateTimerPositions();
            });

            box.appendChild(labelEl);
            box.appendChild(closeBtn);
            document.body.appendChild(box);

            activeTimers[id] = { box, labelEl, remaining: seconds };

            // Dragging
            let dragging = false, offsetX = 0, offsetY = 0;
            box.addEventListener("mousedown", e => {
                dragging = true;
                offsetX = e.clientX - box.offsetLeft;
                offsetY = e.clientY - box.offsetTop;
                box.style.cursor = "grabbing";
            });
            const onUp = () => { dragging = false; box.style.cursor = "move"; };
            const onMove = (e) => {
                if (!dragging) return;
                box.style.left = Math.max(6, Math.min(window.innerWidth - box.offsetWidth - 6, e.clientX - offsetX)) + "px";
                box.style.top = Math.max(6, Math.min(window.innerHeight - box.offsetHeight - 6, e.clientY - offsetY)) + "px";
            };
            document.addEventListener("mouseup", onUp);
            document.addEventListener("mousemove", onMove);

            const interval = setInterval(() => {
                if (!activeTimers[id]) return clearInterval(interval);
                activeTimers[id].remaining--;
                if (activeTimers[id].remaining <= 0) {
                    activeTimers[id].labelEl.innerText = `✅ ${label} done`;
                    clearInterval(interval);
                    setTimeout(() => {
                        try { box.remove(); } catch (e) { }
                        delete activeTimers[id];
                        updateTimerPositions();
                    }, 2500);
                } else {
                    activeTimers[id].labelEl.innerText = `⏳ ${label}: ${activeTimers[id].remaining}s`;
                }
            }, 1000);

            updateTimerPositions();
        };

        // ------------------------------
        // Gather active quests
        // ------------------------------
        const allQuests = Array.from(QuestsStore.quests.values?.() ?? QuestsStore.quests ?? []);
        const activeQuests = allQuests.filter(q =>
            q &&
            q?.id !== "1248385850622869556" &&
            q.userStatus?.enrolledAt &&
            !q.userStatus?.completedAt &&
            new Date(q?.config?.expiresAt).getTime() > Date.now()
        );

        if (!activeQuests || activeQuests.length === 0) {
            console.log("No available uncompleted quests found.");
            return;
        }

        // ------------------------------
        // Ask which task types to enable
        // ------------------------------
        const taskTypes = ["WATCH_VIDEO", "WATCH_VIDEO_ON_MOBILE", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY"];
        const enabledTasks = [];
        for (const task of taskTypes) {
            try {
                if (confirm(`Enable spoofing for ${task.replaceAll("_", " ")}?`)) enabledTasks.push(task);
            } catch (e) {
                // fallback if confirm not available
                enabledTasks.push(task);
            }
        }
        console.clear();
        console.log("Enabled tasks:", enabledTasks);

        const isApp = typeof DiscordNative !== "undefined";

        // ------------------------------
        // Utility helpers
        // ------------------------------
        const safeApiPost = async (opts) => {
            try { return await api.post(opts); } catch (e) { return { ok: false, error: e }; }
        };
        const safeApiGet = async (opts) => {
            try { return await api.get(opts); } catch (e) { return { ok: false, error: e }; }
        };

        // ------------------------------
        // Run all quests in parallel
        // ------------------------------
        await Promise.all(activeQuests.map(async quest => {
            try {
                const applicationId = quest.config?.application?.id;
                const applicationName = quest.config?.application?.name ?? "Unknown App";
                const taskConfig = quest.config?.taskConfig ?? quest.config?.taskConfigV2 ?? {};
                const tasks = taskConfig.tasks ?? {};

                for (const taskName of Object.keys(tasks)) {
                    if (!enabledTasks.includes(taskName)) continue;
                    const secondsNeeded = tasks[taskName]?.target ?? 0;
                    let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;
                    const pid = Math.floor(Math.random() * 30000) + 1000;

                    createQuestTimer(`${quest.id}-${taskName}`, `${applicationName} (${taskName.replaceAll("_"," ")})`, Math.max(0, secondsNeeded - secondsDone));

                    // WATCH_VIDEO / WATCH_VIDEO_ON_MOBILE
                    if (["WATCH_VIDEO", "WATCH_VIDEO_ON_MOBILE"].includes(taskName)) {
                        (async () => {
                            try {
                                const enrolledAt = new Date(quest.userStatus.enrolledAt).getTime();
                                const speed = 7, interval = 1, maxFuture = 10;
                                while (secondsDone < secondsNeeded) {
                                    const maxAllowed = Math.floor((Date.now() - enrolledAt) / 1000) + maxFuture;
                                    const increment = Math.min(speed, Math.max(0, maxAllowed - secondsDone));
                                    if (increment > 0) {
                                        await safeApiPost({
                                            url: `/quests/${quest.id}/video-progress`,
                                            body: { timestamp: Math.min(secondsNeeded, secondsDone + increment + Math.random()) }
                                        });
                                        secondsDone = Math.min(secondsNeeded, secondsDone + increment);
                                    }
                                    if (secondsDone >= secondsNeeded) break;
                                    await new Promise(r => setTimeout(r, interval * 1000));
                                }
                                console.log(`✅ Completed video quest: ${applicationName} (${taskName})`);
                            } catch (e) { console.warn("Video spoof error", e); }
                        })();
                    }

                    // PLAY_ON_DESKTOP
                    else if (taskName === "PLAY_ON_DESKTOP") {
                        if (!isApp) {
                            console.log(`⚠️ PLAY_ON_DESKTOP requires desktop app: ${applicationName}`);
                        } else {
                            (async () => {
                                try {
                                    const res = await safeApiGet({ url: `/applications/public?application_ids=${applicationId}` });
                                    const appData = Array.isArray(res?.body) ? res.body[0] : (res.body ?? {});
                                    const exe = (appData.executables || []).find(x => x.os === "win32") || {};
                                    const exeName = (exe.name || "game.exe").replace(">", "");
                                    const fakeGame = {
                                        cmdLine: `C:\\Program Files\\${appData.name || applicationName}\\${exeName}`,
                                        exeName,
                                        exePath: `c:/program files/${(appData.name || applicationName).toLowerCase()}/${exeName}`,
                                        hidden: false,
                                        isLauncher: false,
                                        id: applicationId,
                                        name: appData.name || applicationName,
                                        pid,
                                        pidPath: [pid],
                                        processName: appData.name || applicationName,
                                        start: Date.now(),
                                    };

                                    const realGames = RunningGameStore.getRunningGames();
                                    const realGetRunningGames = RunningGameStore.getRunningGames;
                                    const realGetGameForPID = RunningGameStore.getGameForPID;

                                    // Replace running games with our fake one
                                    RunningGameStore.getRunningGames = () => [fakeGame];
                                    RunningGameStore.getGameForPID = p => [fakeGame].find(g => g.pid === p);
                                    FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: [fakeGame] });

                                    const fn = data => {
                                        try {
                                            const progress = Math.floor(data?.userStatus?.progress?.PLAY_ON_DESKTOP?.value ?? 0);
                                            if (progress >= secondsNeeded) {
                                                console.log(`✅ Completed PLAY_ON_DESKTOP: ${applicationName}`);
                                                // restore
                                                RunningGameStore.getRunningGames = realGetRunningGames;
                                                RunningGameStore.getGameForPID = realGetGameForPID;
                                                FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: [] });
                                                FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                                            }
                                        } catch (e) { /* ignore */ }
                                    };
                                    FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                                } catch (e) { console.warn("Play on desktop error", e); }
                            })();
                        }
                    }

                    // STREAM_ON_DESKTOP
                    else if (taskName === "STREAM_ON_DESKTOP") {
                        if (!isApp) {
                            console.log(`⚠️ STREAM_ON_DESKTOP requires desktop app: ${applicationName}`);
                        } else {
                            try {
                                const realFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata;
                                ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({ id: applicationId, pid, sourceName: null });

                                const fn = data => {
                                    try {
                                        const progress = Math.floor(data?.userStatus?.progress?.STREAM_ON_DESKTOP?.value ?? 0);
                                        if (progress >= secondsNeeded) {
                                            console.log(`✅ Completed STREAM_ON_DESKTOP: ${applicationName}`);
                                            ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc;
                                            FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                                        }
                                    } catch (e) { /* ignore */ }
                                };
                                FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                            } catch (e) { console.warn("Stream spoof error", e); }
                        }
                    }

                    // PLAY_ACTIVITY
                    else if (taskName === "PLAY_ACTIVITY") {
                        (async () => {
                            try {
                                const privateChannels = ChannelStore.getSortedPrivateChannels?.() ?? [];
                                const channelId = privateChannels[0]?.id ??
                                    Object.values(GuildChannelStore.getAllGuilds?.() ?? {}).find(g => g?.VOCAL?.length > 0)?.VOCAL?.[0]?.channel?.id;
                                if (!channelId) {
                                    console.warn("No suitable voice channel found for activity spoofing.");
                                    return;
                                }
                                const streamKey = `call:${channelId}:1`;

                                while (true) {
                                    const res = await safeApiPost({
                                        url: `/quests/${quest.id}/heartbeat`,
                                        body: { stream_key: streamKey, terminal: false }
                                    });
                                    const progress = res?.body?.progress?.PLAY_ACTIVITY?.value ?? 0;
                                    if (progress >= secondsNeeded) {
                                        await safeApiPost({
                                            url: `/quests/${quest.id}/heartbeat`,
                                            body: { stream_key: streamKey, terminal: true }
                                        });
                                        break;
                                    }
                                    await new Promise(r => setTimeout(r, 20000));
                                }
                                console.log(`✅ Completed PLAY_ACTIVITY: ${applicationName}`);
                            } catch (e) { console.warn("Activity spoof error", e); }
                        })();
                    }
                }
            } catch (err) {
                console.warn("Quest handler error", err);
            }
        }));

        console.log("All quest tasks initiated (running in background).");
    } catch (e) {
        console.error("Script error:", e);
    }
})();
