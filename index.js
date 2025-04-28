$( document ).ready(function() {
    const app = new App();
    window["app"] = app;
});

const BACKEND = "https://tbot.frenlycoin.com"

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
    ref;
    menuActive;
    theme;
    userData;
    miningActive;
    miningRestart;
    viewportHeight;
    start;

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
                        app.tg.SecondaryButton.show();
                        app.tg.MainButton.show();
                        app.tg.BackButton.hide();
                        app.screens = ["home"]
                    } else {
                        app.tg.SecondaryButton.hide();
                        app.tg.MainButton.hide();
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

            this.tg.SecondaryButton.setText("Compound")
            // this.tg.SecondaryButton.show();
            this.tg.SecondaryButton.color = this.tg.themeParams.button_color;
            this.tg.SecondaryButton.textColor = "#FFFFFF";
            this.tg.SecondaryButton.onClick(this.compound);
    
            this.tg.MainButton.setText("Add FREN")
            // this.tg.MainButton.show();
            this.tg.MainButton.onClick(this.openNew);
    
            $("#first_name").html(userData.user.first_name);

            // this.tg.close();

            if (userData.start_param && userData.start_param.startsWith('b-')) {
                // app.tg.openTelegramLink('https://t.me/FrenlyNews/195');
                this.boost();
            } else {
                this.loadData();
                $("#main").show();
            }

            Telegram.WebApp.onEvent("activated", function() {
                // if (app && app.userData.start_param.startsWith('b-')) {
                //     // alert(app.userData.start_param);
                //     // app.tg.openTelegramLink('https://t.me/FrenlyNews/195');
                //     app.tg.close();
                // } else {
                    
                // }
                location.reload();
            });
        } catch (e) {
            console.log(e);
            // this.tgid = 7422140567;
            // this.loadData();
            // $("#first_name").html("Dev");
            // this.resize();
            // $("#infoMessage").html("<small><strong>Join <a href=\"https://t.me/FrenlyCoin\" target=\"_blank\" class=\"text-danger\">@FrenlyCoin</a> group for help and support!</strong></small>")
            // $("#infoMessage").show();
            $("#boost").show();
            this.boost();
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
            this.tg.SecondaryButton.show();
            this.tg.MainButton.show();
            this.tg.BackButton.hide();
            this.screens = ["home"]
        } else {
            this.tg.SecondaryButton.hide();
            this.tg.MainButton.hide();
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
                    this.tg.SecondaryButton.show();
                    this.tg.MainButton.show();
                    this.tg.BackButton.hide();
                    this.screens = ["home"]
                } else {
                    this.tg.SecondaryButton.hide();
                    this.tg.MainButton.hide();
                    this.tg.BackButton.show();
                }
            }
            app.menuActive = false;
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
            url: BACKEND + "/data/" + this.tgid + "/" + this.ref + "/" + username + "/" + first_name + "?ts=" + ts,
            success: function(data) {
                app.tg.SecondaryButton.show();
                app.tg.MainButton.show();

                if (!app.miningRestart) {
                    if (data.is_follower) {
                        tl.play();
                        $("#miningyes").show();
                    } else if (!data.is_follower) {
                        $("#miningno").show();
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

                    $("#successMessage").fadeIn(function() {
                        setTimeout(function() {
                            $("#successMessage").fadeOut();
                        }, 5000);
                    });
                    app.miningAlreadyActive = false;
                } else if (!app.miningActive && app.miningRestart) {
                    tl.play();
                    $("#miningyes").show();
                    app.callRestartMining();
                }

                app.data = data;
                $("#refLink").html("t.me/FrenlyRobot?start=" + data.code);
                $("#earnings").html(data.earnings);
                $("#tmu").html(data.tmu.toFixed(9));
                app.tmu = data.tmu;
                app.lastUpdated = new Date(data.last_updated);
                app.timeLock = new Date(data.time_lock);
                $("#addressDeposit").val(data.addr_deposit);
                if (data.addr_withdraw != data.code) {
                    $("#addressWithdraw").val(data.addr_withdraw);
                }

                if (data.is_follower) {
                    app.countEarnings();
                }

                if (data.boosts != null && data.boosts.length > 0) {
                    console.log(data.boosts[0].link)
                    $("#health-boosts").html('<strong><a class="link-custom" href="https://' + data.boosts[0].link + '">' + data.boosts.length + ' Boosts Available</a></strong>');
                }
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

        $("#refLinkSuccess").fadeIn(function() {
            setTimeout(function() {
                $("#refLinkSuccess").fadeOut();
            }, 5000);
        });
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
        $("#earnings").html(earnings);
        
        var r = app.getRewards();
        $("#earningsth").html((earnings / 10).toFixed(9));

        app.tmout = setTimeout(app.countEarnings, 1000);
    }

    getRewards() {
        var now = new Date();
        var diff = now - this.lastUpdated;
        var mt = new Date(this.data.mining_time);
        diff /= 1000;
        var r = diff * this.tmu / (2400 * 3600);
        var health_index = this.data.health / 100;
        r = r * health_index;
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
        $("#health").width(app.data.health + "%");
        $("#health-text").html(app.data.health + "%");

        if (app.data.health < 33) {
            $("#health").removeClass("bg-success");
            $("#health").addClass("bg-danger");
        } else if (app.data.health < 66) {
            $("#health").removeClass("bg-success");
            $("#health").addClass("bg-warning");
        }
    }

    compound() {
        app.tg.SecondaryButton.showProgress(true);
        app.miningRestart = false;

        $.ajax({
            method: "POST",
            url: BACKEND + "/compound/" + app.tgid,
            success: function(data) {
                clearTimeout(app.tmout);
                app.loadData();

                app.tg.SecondaryButton.hideProgress();

                $("#successMessage").html("<small><strong>Reward compounding done successfully.</strong></small>");

                $("#successMessage").fadeIn(function() {
                    setTimeout(function() {
                        $("#successMessage").fadeOut();
                    }, 5000);
                });
            }
        });
    }

    openNew() {
        app.openScreen('new');
    }

    checkPayment() {
        $("#payment").fadeOut(function() {
            $("#paymentLoading").fadeIn();
            $.ajax({
                method: "GET",
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
            url: BACKEND + "/data/" + this.tgid + "/" + this.ref + "/" + this.userData.user.username + "/" + this.userData.user.first_name + "?ts=" + ts,
            success: function(data) {
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
                app.tg.SecondaryButton.show();
                app.tg.MainButton.show();
            }
            window.history.go(-1);
            $("#screen_menu").hide();
            app.menuActive = false;
        }
        this.openScreen("withdraw");
    }

    loadWithdrawStats() {
        var r = app.getRewards();
        $("#earningsw").html(r);
        $("#earningst").html((r / 10).toFixed(9));
    }

    withdraw() {
        var r = this.getRewards();
        if (r > 0.05) {
            if (this.data.addr_withdraw != this.data.code) {
                this.tg.showConfirm("Are you sure you want to withdraw your rewards?", function(sure) {
                    if (sure) {
                        $.ajax({
                            method: "POST",
                            url: BACKEND + "/withdraw/" + app.tgid,
                            success: function(data) {
                                clearTimeout(app.tmout);
                                app.loadData();
                            }
                        });
    
                        $("#successMessage").html("<small><strong>Withdraw done successfully.</strong></small>");
    
                        $("#successMessage").fadeIn(function() {
                            setTimeout(function() {
                                $("#successMessage").fadeOut();
                            }, 5000);
                        });
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
                        app.tg.SecondaryButton.show();
                        app.tg.MainButton.show();
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
            url: BACKEND + "/restart/" + app.tgid,
            success: function(data) {
                app.countEarnings();

                $("#successMessage").html("<small><strong>Daily mining cycle restarted successfully.</strong></small>");

                $("#successMessage").fadeIn(function() {
                    setTimeout(function() {
                        $("#successMessage").fadeOut();
                    }, 5000);
                });
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

    boost() {
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
            url: BACKEND + "/data/" + this.tgid + "/" + this.ref + "/" + username + "/" + first_name + "?ts=" + ts,
            success: function(data) {
                $("#healthBoost").width(data.health + "%");
                $("#health-text-boost").html(data.health + "%");

                $.ajax({
                    method: "POST",
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