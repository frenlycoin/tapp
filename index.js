$( document ).ready(function() {
    const app = new App();
    window["app"] = app;
});

const BACKEND = "https://frenlytbot.aintchain.com"

class App {

    activeScreen;
    screens;
    tg;
    tgid;
    tmu;
    simulationRunning;
    lastUpdated;
    simulating;
    timeLock;
    tmout;
    data;
    price;
    ref;
    menuActive;
    theme;
    userData;
    miningActive;
    miningRestart;
    viewportHeight;
    dev;

    constructor() {
        this.simulationRunning = false;
        this.tgid = 7967928871;
        this.simulating = false;
        this.menuActive = false;
        this.activeScreen = "home";
        this.screens = ["home"];
        this.miningActive = true;
        this.miningRestart = false;
        try {
            this.tg = Telegram.WebApp;

            // Ask permission for bot to send messages
            this.tg.requestWriteAccess(function(success) {
                if (success) {
                    console.log("Write access granted");
                }
            });

            // Expand to fullscreen
            this.tg.expand();
            // this.tg.enableClosingConfirmation();

            // Lock viewport to stable dimensions
            this.tg.disableVerticalSwipes();

            // Keep the app expanded when viewport changes
            Telegram.WebApp.onEvent('viewportChanged', function() {
                if (!Telegram.WebApp.isExpanded) {
                    Telegram.WebApp.expand();
                }
            });

            // Re-expand on any resize (handles keyboard open/close, etc.)
            window.addEventListener('resize', function() {
                if (window.Telegram && Telegram.WebApp && !Telegram.WebApp.isExpanded) {
                    Telegram.WebApp.expand();
                }
                app.checkScroll();
            });

            this.tg.SettingsButton.show();
            this.tg.SettingsButton.onClick(function() {
                app.menuActive = false;
                app.openScreen("settings");
            });

            this.tg.BackButton.onClick(function() {
                if (app.menuActive) {
                    app.menuClicked();
                } else if (app.screens.length > 1) {
                    app.screens.pop();
                    var screen = app.screens.slice(-1);
                    var current = app.activeScreen;
                    app.activeScreen = screen;
            
                    $("#screen_" + current).fadeOut(function() {
                        $("#screen_" + screen).fadeIn();
                    });
            
                    if (screen == "home") {
                        // app.tg.SecondaryButton.show();
                        // app.tg.MainButton.show();
                        app.tg.BackButton.hide();
                        app.screens = ["home"]
                    } else {
                        // app.tg.SecondaryButton.hide();
                        // app.tg.MainButton.hide();
                        app.tg.BackButton.show();
                    }
                }
            });
    
            const params = new URLSearchParams(Telegram.WebApp.initData);
            const userData = Object.fromEntries(params);
            userData.user = JSON.parse(userData.user);

            this.viewportHeight = this.tg.viewportHeight;

            if (this.viewportHeight < 700) {
                this.resize();
            }

            this.userData = userData;

            this.tgid = userData.user.id;
            if (userData.start_param && userData.start_param != "restart" && !userData.start_param.startsWith('b-')) {
                this.ref = userData.start_param;
            } else if (userData.start_param && !userData.start_param.startsWith('b-')) {
                this.miningRestart = true;
            }

            // this.tg.SecondaryButton.setText("Compound")
            // this.tg.SecondaryButton.show();
            // this.tg.SecondaryButton.color = this.tg.themeParams.button_color;
            // this.tg.SecondaryButton.textColor = "#FFFFFF";
            // this.tg.SecondaryButton.onClick(this.compound);
    
            // this.tg.MainButton.setText("Add FREN")
            // this.tg.MainButton.show();
            // this.tg.MainButton.onClick(this.openNew);
    
            $("#first_name").html(userData.user.first_name);

            // this.tg.close();

            if (userData.start_param && userData.start_param.startsWith('b-')) {
                this.showBoostScreen();
            } else {
                this.loadData();
                $("#main").show();
            }

            Telegram.WebApp.onEvent("activated", function() {
                location.reload();
            });

            // Refresh app when page becomes visible again (e.g. switching back to tab/desktop)
            document.addEventListener("focus", function() {
                if (!document.hidden) {
                    location.reload();
                }
            });
        } catch (e) {
            // console.log(e);
            this.tgid = 7422140567;
            this.loadData();
            $("#first_name").html("Dev");
            this.resize();
            $("#infoMessage").html("<small><strong>Join <a href=\"https://t.me/FrenlyCoin\" target=\"_blank\" class=\"text-danger\">@FrenlyCoin</a> group for help and support!</strong></small>")
            $("#infoMessage").show();
            // $("#boost").show();
            // this.boost();
        }
    }

    openScreen(screen) {
        this.menuActive = false;
        this.screens.push(screen);
        var current = this.activeScreen;
        this.activeScreen = screen;

        $("#screen_" + current).fadeOut(function() {
            $("#screen_" + screen).fadeIn();
        });

        if (screen == "home") {
            // this.tg.SecondaryButton.show();
            // this.tg.MainButton.show();
            this.tg.BackButton.hide();
            this.screens = ["home"]
        } else {
            // this.tg.SecondaryButton.hide();
            // this.tg.MainButton.hide();
            this.tg.BackButton.show();
        }
    }

    menuClicked() {
        if (!app.menuActive) {
            app.menuActive = true;
            this.openScreen("menu");
        } else {
            if (app.screens.length > 1) {
                console.log("fdsfdsa");
                app.screens.pop();
                var screen = app.screens.slice(-1);
                this.activeScreen = screen;

                $("#screen_menu").fadeOut(function() {
                    $("#screen_" + screen).fadeIn();
                });

                if (screen == "home") {
                    // this.tg.SecondaryButton.show();
                    // this.tg.MainButton.show();
                    this.tg.BackButton.hide();
                    this.screens = ["home"]
                } else {
                    // this.tg.SecondaryButton.hide();
                    // this.tg.MainButton.hide();
                    this.tg.BackButton.show();
                }
            }
            app.menuActive = false;
        }
    }

    normalizePrice(price) {
        return Number(price || 0) / 1000000000;
    }

    formatPrice(price) {
        return Number(price || 0).toFixed(9);
    }

    formatNumber(num) {
        const parts = num.toString().split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }

    updatePriceDisplay() {
        const price = this.normalizePrice(this.price);
        const priceText = this.formatPrice(price);
        if (document.getElementById("newPriceValue")) {
            $("#newPriceValue").html(priceText);
        }
        if (document.getElementById("withdrawPriceValue")) {
            $("#withdrawPriceValue").html(priceText + " TON");
        }
        const rewards = app.getRewards();
        if (document.getElementById("earningsth")) {
            $("#earningsth").html(this.formatNumber((rewards * price).toFixed(9)));
        }
        // const withdrawRewards = parseFloat($("#earningsw").text()) || 0;
        if (document.getElementById("earningst")) {
            $("#earningst").html(this.formatNumber((rewards * price).toFixed(9)));
        }
    }

    loadData() {
        var username = "undefined";
        var first_name = "undefined";
        if (this.userData) {
            username = this.userData.user.username;
            first_name = this.userData.user.first_name;
        }
        var ts = new Date().getTime();
        $.ajax({
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "true"
            },
            url: BACKEND + "/data/" + this.tgid + "/" + this.ref + "/" + username + "/" + first_name + "?ts=" + ts,
            success: function(data) {
                app.price = data.price;
                app.miningActive = data.cycle_active;
                // app.tg.SecondaryButton.show();
                // app.tg.MainButton.show();

                if (!app.miningRestart) {
                    if (data.is_follower && data.cycle_active) {
                        tl.play();
                        $("#miningyes").show();
                    } else if (!data.is_follower) {
                        $("#miningno").show();
                    } else if (!data.cycle_active) {
                        $("#miningnocycle").show();
                    }
                }

                if (!data.is_member && data.is_follower) {
                    $("#infoMessage").html("<small><strong>Join <a href=\"https://t.me/FrenlyCoin\" target=\"_blank\" class=\"text-danger\">@FrenlyCoin</a> group for help and support!</strong></small>")
                    $("#infoMessage").show();
                }

                if (app.miningActive && app.miningRestart) {
                    tl.play();
                    $("#miningyes").show();
                    
                    $("#successMessage").html("<small><strong>Mining is already active, wait for the notification to restart.</strong></small>");

                    $("#successMessage").addClass("show");
                    setTimeout(function() {
                        $("#successMessage").removeClass("show");
                    }, 5000);
                    app.miningAlreadyActive = false;
                } else if (!app.miningActive && app.miningRestart) {
                    tl.play();
                    $("#miningyes").show();
                    app.callRestartMining();
                }

                app.data = data;
                $("#refLink").html("t.me/FrenlyRobot?start=" + data.code);
                $("#earnings").html(app.formatNumber(data.earnings));
                $("#tmu").html(app.formatNumber(data.tmu.toFixed(9)));
                app.tmu = data.tmu;
                app.lastUpdated = new Date(data.last_updated);
                app.updatePriceDisplay();
                app.timeLock = new Date(data.time_lock);
                $("#addressDeposit").val(data.addr_deposit);
                if (data.addr_withdraw != data.code) {
                    $("#addressWithdraw").val(data.addr_withdraw);
                }

                if (data.is_follower && data.cycle_active) {
                    app.countEarnings();
                }

                // Update referral health progress bar
                var healthRef = (data.health_ref || 0) * 100;
                $("#healthref").width(healthRef + "%");
                $("#healthref-text").html(parseInt(healthRef) + "%");
                $("#healthref").removeClass("bg-success bg-warning bg-danger");
                if (healthRef <= 33) {
                    $("#healthref").addClass("bg-danger");
                } else if (healthRef <= 66) {
                    $("#healthref").addClass("bg-warning");
                } else if (healthRef >= 100) {
                    $("#healthref").addClass("bg-success");
                }

                // Update referral stats
                if (data.referral_count != null) {
                    $("#referralCount").html(data.referral_count);
                }
                if (data.referred_users != null) {
                    var activeCount = data.referred_users.filter(function(u) { return u.is_active; }).length;
                    $("#activeReferralCount").html(activeCount);
                } else {
                    $("#activeReferralCount").html("0");
                }

                // Update inactive miners list
                if (data.referred_users != null) {
                    var inactiveUsers = data.referred_users.filter(function(u) { return !u.is_active; });
                    if (inactiveUsers.length > 0) {
                        var listHtml = "";
                        for (var i = 0; i < inactiveUsers.length; i++) {
                            var u = inactiveUsers[i];
                            if (i > 0) {
                                listHtml += "<br>";
                            }
                            if (u.username && u.username != "undefined" && u.username != "") {
                                listHtml += '<strong><a class="link-custom" href="https://t.me/' + u.username + '" target="_blank">' + u.name + '</a></strong>';
                            } else {
                                listHtml += u.name;
                            }
                        }
                        $("#inactiveMinersList").html(listHtml);
                        $("#remindButtonSection").show();
                    } else {
                        $("#inactiveMinersList").html("0");
                        $("#remindButtonSection").hide();
                    }
                    $("#inactiveMinersSection").show();
                } else {
                    $("#inactiveMinersList").html("0");
                    $("#remindButtonSection").hide();
                    $("#inactiveMinersSection").show();
                }

                // Update notification dot on Referred button
                if (healthRef < 100) {
                    $("#referred-dot").show();
                    $("#referred-dot").removeClass("dot-danger dot-warning dot-success");
                    if (healthRef <= 33) {
                        $("#referred-dot").addClass("dot-danger");
                    } else if (healthRef <= 66) {
                        $("#referred-dot").addClass("dot-warning");
                    }
                } else {
                    $("#referred-dot").hide();
                }

                if (data.boosts != null && data.boosts.length > 0) {
                    console.log(data.boosts[0].link)
                    $("#health-boosts").html('<strong><a class="link-custom" href="https://' + data.boosts[0].link + '">' + data.boosts.length + ' Boosts Available</a></strong>');
                    $(".nav-btn-boost").addClass("boost-available");
                } else {
                    $(".nav-btn-boost").removeClass("boost-available");
                }

                // Store dev flag and update Telegram links
                app.dev = data.dev || false;
                app.updateTelegramLinks();
                // Re-update refLink with the code for both refLink elements
                $("[id='refLink']").html("t.me/" + (app.dev ? "Dev" : "") + "FrenlyRobot?start=" + data.code);

                app.checkScroll();
            }
        });
    }

    copyLink() {
        var link = $("#refLink").html();
        $("#copy").val(link);

        var copyText = document.getElementById("copy");

        copyText.select();
        copyText.setSelectionRange(0, 99999);

        navigator.clipboard.writeText(copyText.value);

        $("#successMessage").html("<small><strong>Link successfully copied.</strong></small>");
        $("#successMessage").addClass("show");
        setTimeout(function() {
            $("#successMessage").removeClass("show");
        }, 5000);
    }

    copyAddress() {
        var copyText = document.getElementById("addressDeposit");

        copyText.select();
        copyText.setSelectionRange(0, 99999);

        navigator.clipboard.writeText(copyText.value);

        $("#addressDepositSuccess").fadeIn(function() {
            setTimeout(function() {
                $("#addressDepositSuccess").fadeOut();
            }, 5000);
        });
    }

    countEarnings() {
        app.loadWithdrawStats();
        var earnings = app.getRewards();
        app.updateProgress();
        $("#earnings").html(app.formatNumber(earnings));
        app.updatePriceDisplay();

        app.tmout = setTimeout(app.countEarnings, 1000);
    }

    getRewards() {
        var now = new Date();
        var diff = now - this.lastUpdated;
        var mt = new Date(this.data.last_updated);
        var diffCycle = now - mt;
        diff /= 1000;
        diffCycle /= 1000;
        var r = diff * this.tmu / (2400 * 3600);
        var cycle_index = (this.data.cycle_count + 1) / ((diffCycle / 3600) / 24);
        if (cycle_index > 1) {
            cycle_index = 1;
        } else if (cycle_index < 0.01) {
            cycle_index = 0.01;
        }
        var health_index = this.data.health / 100;
        r = r * cycle_index * health_index;
        if (this.data.is_follower) {
            if (r < 0) {
                r = 0;
            }

            return r.toFixed(9);
        } else {
            r = 0;
            return r.toFixed(9);
        }
    }

    updateProgress() {
        var now = new Date();
        var mt = new Date(this.data.mining_time);
        var me = new Date(mt.getTime() + 1410*60000);
        var meh = me.getHours();
        var mem = me.getMinutes();

        if (meh >= 0 && meh <= 9) {
            meh = "0" + meh;
        }

        if (mem >= 0 && mem <= 9) {
            mem = "0" + mem;
        }

        var diffCycle = now - mt;
        diffCycle /= 60000;

        var percent = diffCycle / 14.10;
        if (percent > 100) {
            percent = 100;
        }
        var width = parseInt(percent);
        // var width = 70;

        $("#progress-bar").width(width + "%");

        $("#progress-text").html(width + "%");

        $("#health").width(app.data.health + "%");
        $("#health-text").html(app.data.health + "%");

        if (app.data.health < 33) {
            $("#health").removeClass("bg-success");
            $("#health").addClass("bg-danger");
        } else if (app.data.health < 66) {
            $("#health").removeClass("bg-success");
            $("#health").addClass("bg-warning");
        }

        $("#cycle-end").html("(" + meh + ":" + mem + ")");
    }

    compound() {
        // app.tg.SecondaryButton.showProgress(true);
        app.miningRestart = false;

        $.ajax({
            method: "POST",
            headers: {
                "ngrok-skip-browser-warning": "true"
            },
            url: BACKEND + "/compound/" + app.tgid,
            success: function(data) {
                clearTimeout(app.tmout);
                app.loadData();

                // app.tg.SecondaryButton.hideProgress();

                $("#successMessage").html("<small><strong>Reward compounding done successfully.</strong></small>");

                $("#successMessage").addClass("show");
                setTimeout(function() {
                    $("#successMessage").removeClass("show");
                }, 5000);
            }
        });
    }

    openNew() {
        app.openScreen('new');
    }

    showReferrals() {
        app.openScreen('referrals');
    }

    showTasks() {
        app.openScreen('tasks');
    }

    checkPayment() {
        $("#payment").fadeOut(function() {
            $("#paymentLoading").fadeIn();
            $.ajax({
                method: "GET",
                headers: {
                    "ngrok-skip-browser-warning": "true"
                },
                url: BACKEND + "/paid/" + app.tgid,
                success: function(data) {
                    $("#paymentLoading").fadeOut(function() {
                        $("#payment").fadeIn();
                        if (data.success) {
                            clearTimeout(app.tmout);
                            app.loadData();

                            $("#minerpng").hide();
                            $("#buttonpng").hide();
                            $("#minergif").show();
                            $("#buttongif").show();

                            $("#simulationMessage").hide();
                            app.simulating = false;
    
                            $("#depositSuccess").fadeIn(function() {
                                setTimeout(function() {
                                    $("#depositSuccess").fadeOut();
                                }, 5000);
                            });
                        } else {
                            $("#depositError").fadeIn(function() {
                                setTimeout(function() {
                                    $("#depositError").fadeOut();
                                }, 5000);
                            });
                        }
                    });
                }
            });
        });
    }

    startMining() {
        var ts = new Date().getTime();
        $.ajax({
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "true"
            },
            url: BACKEND + "/data/" + this.tgid + "/" + this.ref + "/" + this.userData.user.username + "/" + this.userData.user.first_name + "?ts=" + ts,
            success: function(data) {
                app.price = data.price;
                app.updatePriceDisplay();
                if (data.is_follower) {
                    app.loadData()
                    tl.play();
                    $("#miningno").hide();
                    $("#miningyes").show();
                } else {
                    $("#mineError").fadeIn(function() {
                        setTimeout(function() {
                            $("#mineError").fadeOut();
                        }, 5000);
                    });
                }
            }
        });
    }

    saveSettings() {
        var av = $("#addressWithdraw").val();

        $("#settings").fadeOut(function() {
            $("#settingsLoading").fadeIn();
            $.ajax({
                method: "POST",
                headers: {
                    "ngrok-skip-browser-warning": "true"
                },
                url: BACKEND + "/save/" + app.tgid,
                data: {
                    address_withdraw: av,
                },
                success: function(data) {
                    $("#settingsLoading").fadeOut(function() {
                        $("#settings").fadeIn();
                        if (data.success) {
                            $("#settingsSuccess").fadeIn(function() {
                                setTimeout(function() {
                                    $("#settingsSuccess").fadeOut();
                                }, 5000);
                            });
                            clearTimeout(app.tmout);
                            app.loadData();
                        } else {
                            $("#settingsError").fadeIn(function() {
                                setTimeout(function() {
                                    $("#settingsError").fadeOut();
                                }, 5000);
                            });
                        }
                    });
                }
            });
        });
    }

    showWithdraw() {
        if (this.menuActive) {
            if (app.activeScreen == "home") {
                app.tg.BackButton.hide();
                // app.tg.SecondaryButton.show();
                // app.tg.MainButton.show();
            }
            window.history.go(-1);
            $("#screen_menu").hide();
            app.menuActive = false;
        }
        this.openScreen("withdraw");
    }

    loadWithdrawStats() {
        var r = app.getRewards();
        $("#earningsw").html(this.formatNumber(r));
        app.updatePriceDisplay();
    }

    withdraw() {
        var r = this.getRewards();
        if (r > 0.05) {
            if (this.data.addr_withdraw != this.data.code) {
                this.tg.showConfirm("Are you sure you want to withdraw your rewards?", function(sure) {
                    if (sure) {
                        $.ajax({
                            method: "POST",
                            headers: {
                                "ngrok-skip-browser-warning": "true"
                            },
                            url: BACKEND + "/withdraw/" + app.tgid,
                            success: function(data) {
                                clearTimeout(app.tmout);
                                app.loadData();
                            }
                        });
    
                        $("#successMessage").html("<small><strong>Withdraw done successfully.</strong></small>");
    
                        $("#successMessage").addClass("show");
                        setTimeout(function() {
                            $("#successMessage").removeClass("show");
                        }, 5000);
                    }
                });
            } else {
                $("#addressError").fadeIn(function() {
                    setTimeout(function() {
                        $("#addressError").fadeOut();
                    }, 5000);
                });
                if (this.menuActive) {
                    if (app.activeScreen == "home") {
                        app.tg.BackButton.hide();
                        // app.tg.SecondaryButton.show();
                        // app.tg.MainButton.show();
                    }
                    window.history.go(-1);
                    $("#screen_menu").hide();
                    app.menuActive = false;
                }
                this.openScreen("settings");
            }
        } else {
            $("#errorMessage").html("<small><strong>Withdrawal fee is 0.005 TON.</strong></small>");
    
            $("#errorMessage").fadeIn(function() {
                setTimeout(function() {
                    $("#errorMessage").fadeOut();
                }, 5000);
            });
        }
        this.openScreen("home");
    }

    callRestartMining() {
        $.ajax({
            method: "POST",
            headers: {
                "ngrok-skip-browser-warning": "true"
            },
            url: BACKEND + "/restart/" + app.tgid,
            success: function(data) {
                app.countEarnings();

                $("#successMessage").html("<small><strong>Daily mining cycle restarted successfully.</strong></small>");

                $("#successMessage").addClass("show");
                setTimeout(function() {
                    $("#successMessage").removeClass("show");
                }, 5000);
            }
        });
    }

    resize() {
        $("#wrapper").removeClass("wrapper");
        $("#wrapper").addClass("wrapper2");

        $(".elem").removeClass("el");
        $(".elem").addClass("el2");

        $("#rewards").removeClass("pb-3");
        $("#rewards").removeClass("pt-4");
        $("#rewards").addClass("pb-2");
        $("#rewards").addClass("pt-3");

        $(".miner").removeClass("p-3");
        $(".miner").removeClass("pb-4");
        $(".miner").addClass("p-2");
        $(".miner").addClass("pb-3");

        $("#miningyes").removeClass("mt-4");
        $("#miningyes").addClass("mt-2");

        // $("#successMessage").removeClass("p-3");
        // $("#errorMessage").removeClass("pb-4");
        // $("#infoMessage").removeClass("mt-1");
        // $(".miner").addClass("p-2");
        // $(".miner").addClass("pb-3");
    }

    checkScroll() {
        // First, show both sections so we can measure properly
        $("#healthSection").show();
        $("#referralSection").show();

        // Force layout reflow to get accurate scroll dimensions
        void document.body.offsetHeight;

        // Use document.body.scrollHeight because html has overflow:hidden,
        // making document.documentElement.scrollHeight unreliable
        var scrollable = document.body.scrollHeight > window.innerHeight;

        if (scrollable) {
            // Hide healthSection first
            $("#healthSection").hide();
            void document.body.offsetHeight;

            // Re-check if there's still scroll
            if (document.body.scrollHeight > window.innerHeight) {
                // Hide referralSection too
                $("#referralSection").hide();
            }
        }
    }

    showBoostScreen() {
        // Hide all main content, show only the boost screen
        $("main").hide();
        $("#bottom-nav").hide();
        $("#boost").show();

        var username = "undefined";
        var first_name = "undefined";
        if (this.userData) {
            username = this.userData.user.username;
            first_name = this.userData.user.first_name;
        }
        var ts = new Date().getTime();

        $.ajax({
            method: "GET",
            crossDomain: true,
            url: BACKEND + "/data/" + this.tgid + "/" + this.ref + "/" + username + "/" + first_name + "?ts=" + ts,
            success: function(data) {
                $("#healthBoost").width(data.health + "%");
                $("#health-text-boost").html(data.health + "%");

                $("#healthBoost").animate({ width: '100%' }, function() {
                    setTimeout(function() {
                        app.tg.close();
                    }, 2000);
                });
                $.ajax({
                    method: "POST",
                    crossDomain: true,
                    url: BACKEND + "/boost/" + app.tgid + "/" + app.userData.start_param + "?ts=" + ts,
                    success: function(data) {
                        $("#health-text-boost").html(data.health + "%");

                        $("#healthBoost").animate({ width: data.health + '%' }, function() {
                            setTimeout(function() {
                                app.tg.close();
                            }, 2000);
                        });
                    }
                });
            }
        });
    }

    remindInactive() {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", BACKEND + "/remind/" + this.tgid, true);
        xhr.setRequestHeader("ngrok-skip-browser-warning", "true");
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    try {
                        var data = JSON.parse(xhr.responseText);
                        if (data.success) {
                            $("#successMessage").html("<small><strong>Reminders sent successfully.</strong></small>");
                            $("#successMessage").addClass("show");
                            setTimeout(function() {
                                $("#successMessage").removeClass("show");
                            }, 5000);
                        } else {
                            $("#errorMessage").html("<small><strong>" + data.errorMessage + "</strong></small>");
                            $("#errorMessage").addClass("show");
                            setTimeout(function() {
                                $("#errorMessage").removeClass("show");
                            }, 5000);
                        }
                    } catch(e) {
                        $("#errorMessage").html("<small><strong>Something went wrong.</strong></small>");
                        $("#errorMessage").addClass("show");
                        setTimeout(function() {
                            $("#errorMessage").removeClass("show");
                        }, 5000);
                    }
                } else {
                    $("#errorMessage").html("<small><strong>Something went wrong.</strong></small>");
                    $("#errorMessage").addClass("show");
                    setTimeout(function() {
                        $("#errorMessage").removeClass("show");
                    }, 5000);
                }
            }
        };
        xhr.send();
    }

    updateTelegramLinks() {
        var prefix = this.dev ? "Dev" : "";
        
        // Update refLink elements (t.me/FrenlyRobot -> t.me/DevFrenlyRobot)
        $("[id='refLink']").each(function() {
            var html = $(this).html();
            html = html.replace(/FrenlyRobot/g, prefix + "FrenlyRobot");
            html = html.replace(/FrenlyNews/g, prefix + "FrenlyNews");
            html = html.replace(/FrenlyCoin/g, prefix + "FrenlyCoin");
            $(this).html(html);
        });

        // Update miningno-subscribe (FrenlyNews)
        var subscribeHtml = $("#miningno-subscribe").html();
        if (subscribeHtml) {
            subscribeHtml = subscribeHtml.replace(/FrenlyRobot/g, prefix + "FrenlyRobot");
            subscribeHtml = subscribeHtml.replace(/FrenlyNews/g, prefix + "FrenlyNews");
            subscribeHtml = subscribeHtml.replace(/FrenlyCoin/g, prefix + "FrenlyCoin");
            $("#miningno-subscribe").html(subscribeHtml);
        }

        // Update miningnocycle-link (FrenlyNews)
        var nocycleHtml = $("#miningnocycle-link").html();
        if (nocycleHtml) {
            nocycleHtml = nocycleHtml.replace(/FrenlyRobot/g, prefix + "FrenlyRobot");
            nocycleHtml = nocycleHtml.replace(/FrenlyNews/g, prefix + "FrenlyNews");
            nocycleHtml = nocycleHtml.replace(/FrenlyCoin/g, prefix + "FrenlyCoin");
            $("#miningnocycle-link").html(nocycleHtml);
        }

        // Update infoMessage (FrenlyCoin)
        var infoHtml = $("#infoMessage").html();
        if (infoHtml) {
            infoHtml = infoHtml.replace(/FrenlyRobot/g, prefix + "FrenlyRobot");
            infoHtml = infoHtml.replace(/FrenlyNews/g, prefix + "FrenlyNews");
            infoHtml = infoHtml.replace(/FrenlyCoin/g, prefix + "FrenlyCoin");
            $("#infoMessage").html(infoHtml);
        }

        // Update contact link
        var contactLink = $("#contact-link").attr("href");
        if (contactLink) {
            contactLink = contactLink.replace(/FrenlyRobot/g, prefix + "FrenlyRobot");
            contactLink = contactLink.replace(/FrenlyNews/g, prefix + "FrenlyNews");
            contactLink = contactLink.replace(/FrenlyCoin/g, prefix + "FrenlyCoin");
            $("#contact-link").attr("href", contactLink);
        }
        var contactHtml = $("#contact-link").html();
        if (contactHtml) {
            contactHtml = contactHtml.replace(/FrenlyRobot/g, prefix + "FrenlyRobot");
            contactHtml = contactHtml.replace(/FrenlyNews/g, prefix + "FrenlyNews");
            contactHtml = contactHtml.replace(/FrenlyCoin/g, prefix + "FrenlyCoin");
            $("#contact-link").html(contactHtml);
        }

        // Update about-app-name
        var aboutAppHtml = $("#about-app-name").html();
        if (aboutAppHtml) {
            aboutAppHtml = aboutAppHtml.replace(/FrenlyRobot/g, prefix + "FrenlyRobot");
            aboutAppHtml = aboutAppHtml.replace(/FrenlyNews/g, prefix + "FrenlyNews");
            aboutAppHtml = aboutAppHtml.replace(/FrenlyCoin/g, prefix + "FrenlyCoin");
            $("#about-app-name").html(aboutAppHtml);
        }

        // Update about-news-channel
        var aboutNewsHtml = $("#about-news-channel").html();
        if (aboutNewsHtml) {
            aboutNewsHtml = aboutNewsHtml.replace(/FrenlyRobot/g, prefix + "FrenlyRobot");
            aboutNewsHtml = aboutNewsHtml.replace(/FrenlyNews/g, prefix + "FrenlyNews");
            aboutNewsHtml = aboutNewsHtml.replace(/FrenlyCoin/g, prefix + "FrenlyCoin");
            $("#about-news-channel").html(aboutNewsHtml);
        }
    }

    boost() {
        var username = "undefined";
        var first_name = "undefined";
        if (this.userData) {
            username = this.userData.user.username;
            first_name = this.userData.user.first_name;
        }
        var ts = new Date().getTime();

        // First check if boosts are available
        $.ajax({
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "true"
            },
            crossDomain: true,
            url: BACKEND + "/data/" + this.tgid + "/" + this.ref + "/" + username + "/" + first_name + "?ts=" + ts,
            success: function(data) {
                if (data.boosts != null && data.boosts.length > 0) {
                    // Boosts available - open the first boost link
                    app.tg.openTelegramLink('https://' + data.boosts[0].link);
                } else {
                    // No boosts available - show warning toast
                    $("#successMessage").html("<small><strong style=\"color: #FFC107;\">No boosts available.</strong></small>");
                    $("#successMessage").addClass("show");
                    setTimeout(function() {
                        $("#successMessage").removeClass("show");
                    }, 5000);
                }
            }
        });
    }

}

const wrapperEl = document.querySelector('.wrapper');
const numberOfEls = 60;
const duration = 6000;
const delay = duration / numberOfEls;

let tl = anime.timeline({
  duration: delay,
  complete: function() { tl.restart(); }
});

function createEl(i) {
  let el = document.createElement('div');
  el.id = "el";
  const rotate = (360 / numberOfEls) * i;
  const translateY = -50;
  el.classList.add('el');
  el.classList.add('blue');
  el.classList.add('elem');
  el.style.transform = 'rotate(' + rotate + 'deg) translateY(' + translateY + '%)';
  tl.add({
    begin: function() {
      anime({
        targets: el,
        rotate: [rotate + 'deg', rotate + 10 +'deg'],
        translateY: [translateY + '%', translateY + 10 + '%'],
        scale: [1, 1.25],
        easing: 'easeInOutSine',
        direction: 'alternate',
        duration: duration * .1
      });
    }
  });
  if (wrapperEl != null) {
    wrapperEl.appendChild(el);
  }
};

for (let i = 0; i < numberOfEls; i++) createEl(i);

tl.pause();