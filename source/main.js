//handle setupevents as quickly as possible
const setupEvents = require('./setupevents')
if (setupEvents.handleSquirrelEvent()) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return;
}

const electron = require('electron');
const {app, BrowserWindow, Menu, Tray, nativeImage, dialog, ipcMain:ipc, screen, globalShortcut} = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
// const displays = require('electron').screen
var schedulelist = [];
var settings = {config:{}, computed:{}, current:{}}; // don't touch config, it goes to settingswin
var userDataPath = app.getPath("userData");
var schedulesPath = path.join(userDataPath,"schedules");
var settingsPath = path.join(userDataPath,"settings.json");
console.log(schedulesPath);
console.log(settingsPath);

var mainwin;
var settingswin;
var reminderswin;
let tray = null;
let updatetime = 1000;

var updater;
var schedule;

//don't run multiple times
// const gotTheLock = app.requestSingleInstanceLock();

// if (!gotTheLock) {
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainwin) {
      console.log('second-instance event, shutting down...');
      if (mainwin.isMinimized()) 
        mainwin.restore(); 
      mainwin.show();
    }
  })
}

// check if schedules/tasks.json exists
// if it doesn't create one
// and run
try {
  schedulelist = fs.readdirSync(schedulesPath);
  schedulelist = schedulelist.map(function(currentValue) {
    return path.join(schedulesPath,currentValue.toString());
  });
  if (schedulelist.length == 0) throw {code:'EMPTY'};
  run();
} catch (e) {
  if (e.code !== 'ENOENT' && e.code !== 'EMPTY') throw e;
  fs.mkdir(schedulesPath, function(err) {
    if (err)
      if (err.code !== 'EEXIST') throw err;
    var tasksPath = path.normalize(path.join(schedulesPath,"tasks.json"));
    console.log(String(tasksPath));

    var d = new Date();
    d.setDate(d.getDate()+1);
    d.setHours(19, 0, 0, 0);
    fs.writeFile(tasksPath,'{"name":"Default","tasks":[{"id":0,"date":"'+encodeDate(d)+'","time":"19:00","timeid":'+d.getTime()+',"title":"Nauczyć się obsługi Deadlines","checked":false,"repeat":false,"priority":1}]}', function(error) {
        if (error) throw error;
        schedulelist = fs.readdirSync(schedulesPath);
        schedulelist = schedulelist.map(function(currentValue) {
          return path.join(schedulesPath,currentValue.toString());
        });
        run();
    });
  });
}
// patch handling
function patchHandler() {
  try {
    const patch = require("./patch.js");
    var isValid = true;
    var versionnumbers = app.getVersion().split(".");
    console.log(JSON.stringify(versionnumbers));
    console.log(JSON.stringify(patch.version.split(".")));
  
    for (var i = 0; i < versionnumbers.length; i++) {
      if (versionnumbers[i] < patch.version.split(".")[i]){
        isValid = false;
        break;
      }
      else if (versionnumbers[i] > patch.version.split(".")[i]) break;
    }
    if (isValid) {
      console.log('patch found!')
      if (patch.execute(schedulelist)){
        fs.unlinkSync("./patch.js");
      }
    }
  } catch (e) {
    if (isValid) console.log(e); // if there is a patch, show errors
  }
}
// end of patch handling

// tu jest właściwy kod tak naprawdę XDDD

function settingsHandler() {
  var defaultsettings = {
    "general": {
      "hide_app_on_autostart": false,
      "default_mode": "list",
      "hide_app_on_blur": true,
      "always_on_top": false,
      "movable": false,
      "add_task_shortcut":"CmdOrCtrl+Shift+Insert",
      "show_shortcut":"CmdOrCtrl+Shift+Home",
      "display_app_corner": "auto",
      "devtools": false
    },
    "list-mode": {
      "show_deadlines_with_other_tasks": false
    },
    "calendar-mode": {
      "default_clickdate": "today"
    }
  };
  settings.config = JSON.parse(JSON.stringify(defaultsettings));
  try {
    var jsonsettings = fs.readFileSync(settingsPath).toString();
    var usersettings = JSON.parse(jsonsettings);
    for (category in usersettings) {
      if (settings.config[category]) {
        for (setting in usersettings[category]) {
          if (settings.config[category][setting] != undefined) {
            settings.config[category][setting] = usersettings[category][setting];
          } else delete usersettings[category][setting];
        }
      } else delete usersettings[category];
    }
  } catch (e) {
    fs.writeFileSync(settingsPath, "{}");
  }
  // set settings
  settings.current.mode = settings.config.general.default_mode;
  function updateWindowPos(silent) {
    var size = screen.getPrimaryDisplay().workArea;
    console.log(size);
    var xy = {
      list: getXYCorner(600,400),
      calendar: getXYCorner(600,800)
    };
    settings.computed.display_app_corner = {};
    if (settings.config.general.display_app_corner == "auto") {
      var corner;
      if (size.x == 0 && size.y == 0) corner = "rightdown";
      else if (size.y>0) corner = "rightup";
      else if (size.x>0) corner = "leftdown";
      settings.computed.display_app_corner.list = xy.list[corner];
      settings.computed.display_app_corner.calendar = xy.calendar[corner];
    } else {
      settings.computed.display_app_corner.list = xy.list[settings.config.general.display_app_corner];
      settings.computed.display_app_corner.calendar = xy.calendar[settings.config.general.display_app_corner];
    }
    console.log("window pos updated");
    if (mainwin) 
      if (!mainwin.isDestroyed())
        mainwin.setBounds(settings.computed.display_app_corner[settings.current.mode]);   
  }
  updateWindowPos(true);
  screen.on("display-metrics-changed", updateWindowPos);

  if (settings.config.general.default_mode=="list") {
    settings.computed.default_mode = "index.html";
    settings.computed.window_size = {height:600,width:400};
  } else if (settings.config.general.default_mode=="calendar") {
    settings.computed.default_mode = "calendar.html";
    settings.computed.window_size = {height:600,width:800};
  }
}

function run() {
  patchHandler();
  console.log('run');
  console.log(schedulelist);
  process.argv.forEach((val, index) => {
    console.log(`${index}: ${val}`);
  });
  if (!app.isReady()) {
    app.on('ready', loadApp);
  } else loadApp();
  app.on('window-all-closed', function(){
    // żeby aplikacja się nie zamykała
  });
  app.on('will-quit', () => {
    // Unregister all shortcuts.
    globalShortcut.unregisterAll()
  })
}

function loginfo(text){
  var startdate = new Date();
  try {
    fs.readdirSync("logs");
  } catch (e) {
    fs.mkdirSync("logs");
  }
  
  fs.appendFileSync(
    'logs/log_'+encodeDate(startdate)+'.txt',
    'LOG '+
    startdate.getDate()+'.'+
    (startdate.getMonth()+1)+'.'+
    startdate.getFullYear()+' '+
    startdate.getHours()+':'+
    (startdate.getMinutes()<10?"0":"")+startdate.getMinutes()+
    "\n"+text+"\n"
  );
}

function hideWindowOnBlur(){
  if (!mainwin.getChildWindows().length && settings.config.general.hide_app_on_blur) mainwin.hide();
}

function loadApp() {
  console.log('loadapp');
  settingsHandler();
	loadTray();

  // Menu.setApplicationMenu(null);

 //  app.setJumpList([
	// {
 //      name: 'Narzędzia',
 //      items: [
 //        {
 //          type: 'task',
 //          title: 'Dodaj nowe zadanie',
 //          program: process.execPath,
 //          args: '--addtask',
 //          icon: process.execPath,
 //          iconIndex: 0,
 //          description: 'Dodaje nowe zadanie do terminarza'
 //        }
 //      ]
 //    }
 //  ]);

  schedule = new Schedule(schedulelist[0]);
  schedule.updateTasks();

  // loginfo(process.argv[2]);
  // loginfo(String(settings.config.general.hide_app_on_autostart));

  if (process.argv.indexOf("--autostart") > -1 && settings.config.general.hide_app_on_autostart)
    showMode(settings.config.general.default_mode,true);
  else
    showMode(settings.config.general.default_mode);

  if (process.argv[2]=="--addtask") {
    mainwin.send("showform", ["add"]);
  }

  if (settings.config.general.add_task_shortcut)
    if(!globalShortcut.register(settings.config.general.add_task_shortcut, function() {
        mainwin.show();
        mainwin.send("showform", ["add"]);
      })) 
      console.log('register shortcut addtask failed');

  if (settings.config.general.show_shortcut)
    if(!globalShortcut.register(settings.config.general.show_shortcut, function() {
        mainwin.show();
      })) 
      console.log('register shortcut addtask failed');

  ipc.on("updatetasks", (event, arg) => {
    schedule.updateTasks(JSON.parse(arg));
    refreshUpdater();
  });

  // if(settings.config.autostart)
  //   app.setLoginItemSettings({
  //     openAtLogin: true,
  //     path: updateDotExe,
  //     args: [
  //       '--processStart', `"${exeName}"`,
  //       '--process-start-args', `"--autostart"`
  //     ]
  //   });
  // else
  //   app.setLoginItemSettings({
  //     openAtLogin: true,
  //     path: updateDotExe,
  //     args: [
  //       '--processStart', `"${exeName}"`,
  //       '--process-start-args', `"--autostart"`
  //     ]
  //   });

  ipc.on("addtask", (event, task) => {
    schedule.addTask(JSON.parse(task));
  });

  ipc.on("deletetask", (event, taskid) => {
    schedule.deleteTask(taskid);
  });

  ipc.on("edittask", (event, task, repeatchoice) => {
    schedule.editTask(JSON.parse(task), repeatchoice);
  });

  ipc.on("showwindow", (event, arg) => {
    showMode("settings");
  });

  ipc.on("showmode", (event, arg) => {
    showMode(arg);
  });

  ipc.on("getsettings", (event) => {
    event.returnValue = settings.config;
  });

  ipc.on("updatesettings", (event, category, strusersettings) => {
    var usersettings = JSON.parse(strusersettings);
    settings.config[category] = usersettings;

    var filesettings = JSON.parse(fs.readFileSync(settingsPath).toString());
    if (!filesettings[category]) filesettings[category] = {};
    filesettings[category] = usersettings;
    fs.writeFileSync(settingsPath,JSON.stringify(filesettings));
  });
}

function sendStuff(a,x,d) {
  try {
    a.send(x, JSON.stringify(d));
  } catch (e) {
      loginfo(e+"\n");
  }
}

function encodeDate(date) {
  return date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate(); 
}

function decodeDate(s) {
  var strdate = s.split("-");
  if (strdate[1]) strdate[1]--;
  var date = new Date(Date.UTC(...strdate));
  return date;
}

function decodeTime(s,date) {
  var strtime = s.split(":").map(Number);
  var time = date.setHours(strtime[0],strtime[1]);
  return time;
}

function Schedule(dir, content) {
  this.date = new Date();
  this.info = {};
  this.info.dir = dir;
  this.info.tasks = {};
  this.info.tasks.path = dir;
  this.info.tasks.jsontxt = (function(cont) {
    if (!cont) {
      console.log('loading file');
      return fs.readFileSync(dir).toString();
    }
    else 
      return JSON.stringify(cont);
  })(content);

  this.content = JSON.parse(this.info.tasks.jsontxt);
  this.content.path = this.info.tasks.path;

  this.repetitiveTasks = this.content.tasks.filter(task => {
    return task.repeat;
  });

  this.getDaySchedule = function (strdate) {
    // repetitiveTasks
    var date = decodeDate(strdate);
    var dayschedule = this.repetitiveTasks.concat([]);
    var dateend = new Date(date.getTime());
    dateend.setDate(date.getDate()+1);

    // expand exceptions
    for (task of dayschedule) {
      if (task.exceptions) 
        for (exception in task.exceptions) {
          dayschedule.push(task.exceptions[exception]);
        }
    }

    // extend repetitive tasks
    for (var i = 0; i < dayschedule.length; i++) {
      var _task = dayschedule[i];
      var task = JSON.parse(JSON.stringify(_task));
      if (!task.repeat) continue;
      var began = decodeDate(task.repeat.began);
      var end;
      
      if (began.getTime()>date.getTime()) continue;
      if (task.repeat.end) {
        end = decodeDate(task.repeat.end);
        if (end.getTime()<date.getTime()) continue;
      }

      // if (schedule.tasksByDate[strdate])
      //  if (schedule.tasksByDate[strdate].findIndex(function(obj) {
      //    return obj.id == task.id
      //  }) >= 0) break;

      switch (task.repeat.unit) {
        case "days":
          var begandays = (date.getTime()-began.getTime())/86400000;
          if (begandays%task.repeat.amount==0) {
            var time = new Date(task.timeid);
            time.setFullYear(
              began.getFullYear(),
              began.getMonth(),
              began.getDate()+begandays
            );
            task.timeid = time.getTime();
            task.date = encodeDate(time);
          }
        break;
        case "weeks":
          var beganweeks = (date.getTime()-began.getTime())/(86400000*7);
          if (beganweeks%task.repeat.amount==0) {
            var time = new Date(task.timeid);
            time.setFullYear(
              began.getFullYear(),
              began.getMonth(),
              began.getDate()+beganweeks*7
            );
            task.timeid = time.getTime();
            task.date = encodeDate(time);
          }
        break;
        case "months":
          var beganmonths = (date.getFullYear()-began.getFullYear())*12+(date.getMonth()-began.getMonth());
          
          if (beganmonths%task.repeat.amount==0) {
            if (
              date.getDate() != began.getDate() && 
              task.repeat.type == "sameday"
            ) break;
            var time = new Date(task.timeid);
            time.setFullYear(
              began.getFullYear(),
              began.getMonth()+beganmonths,
              began.getDate()
            );
            if (task.repeat.type == "sameweekday") {
              time.setDate(1);
              while (time.getDay()!=began.getDay()) {
                time.setDate(time.getDate()+1);
              }
              time.setDate(time.getDate()+7*(getWhichWeekDay(began)-1));
              if (
                began.getDay() != date.getDay() ||
                getWhichWeekDay(began) != getWhichWeekDay(date)
              ) break;
            }
            task.timeid = time.getTime();
            task.date = encodeDate(time);
          }
        break;
        case "years":
          var beganyears = date.getFullYear()-began.getFullYear();
          if (
            beganyears%task.repeat.amount==0 &&
            date.getMonth() == began.getMonth() && 
            date.getDate() == began.getDate()
          ) {
            var time = new Date(task.timeid);
            time.setFullYear(
              began.getFullYear()+beganyears,
              began.getMonth(),
              began.getDate()
            );
            task.timeid = time.getTime();
            task.date = encodeDate(time);
          }
          break;
      }
      if (
        task.timeid != _task.timeid &&
        task.date == strdate
      ) {
        dayschedule.push(task);
      }
    }
    // orderedList
    dayschedule = dayschedule.concat(this.tasksByDate[strdate] || []);
    if (dayschedule[0] == undefined || !dayschedule) return [];

    //delete olddates
    var a = 0;
    var b = 0;
    do {
      a = Number(b);
      for (task of dayschedule) {
        if (task.exceptions) {
          for (exception in task.exceptions) {
            if (task.exceptions[exception].olddate == task.date) {
              var index;
              b++;
              // do {
                index = dayschedule.findIndex(function(obj) {
                  return obj.id == task.id
                });
                dayschedule.splice(index,1);
              // } while (index>=0);
            }
          }
        }
      }
    } while (a != b);
    // deleting all misleading tasks
    for (var i = 0; i < dayschedule.length; i++) {
      if (dayschedule[i].date != strdate || dayschedule[i].hide) {
        dayschedule.splice(i,1);
        i--;
      } else if (dayschedule[i].repeat) {
        if (dayschedule[i].repeat.end)
          if (decodeDate(dayschedule[i].repeat.end).getTime()<decodeDate(strdate)) {
            dayschedule.splice(i,1);
            i--;
          }
      }
    }

    return (dayschedule || []);
  }

  this.orderedList = (function (schedule) {
    var today = new Date();
    for (var i = 0; i < schedule.repetitiveTasks.length; i++) {
      if (
          schedule.repetitiveTasks[i].checked <= schedule.repetitiveTasks[i].timeid &&
          schedule.repetitiveTasks[i].timeid <= today.getTime()
      ) {
        schedule.repetitiveTasks[i].checked = false;
        var repeat = schedule.repetitiveTasks[i].repeat;

        while (
          schedule.repetitiveTasks[i].timeid < today.getTime()
        ) {
          switch (repeat.unit) {
            case "days":
              var time = new Date(schedule.repetitiveTasks[i].timeid);
              time.setDate(time.getDate()+repeat.amount);
              schedule.repetitiveTasks[i].timeid = time.getTime();
              schedule.repetitiveTasks[i].date = encodeDate(time);
              break;
            case "weeks":
              var time = new Date(schedule.repetitiveTasks[i].timeid);
              time.setDate(time.getDate()+repeat.amount*7);
              schedule.repetitiveTasks[i].timeid = time.getTime();
              schedule.repetitiveTasks[i].date = encodeDate(time);
              break;
            case "months":
              var time = new Date(schedule.repetitiveTasks[i].timeid);
              if (repeat.type == "sameday") {
                time.setMonth(time.getMonth()+repeat.amount);
              } else if (repeat.type == "sameweekday") {
                var weekday = time.getDay(); // dzień tygodnia
                var nweekday = 0; // który dzień tygodnia
                var nd = new Date(time.getTime());
                while (time.getMonth()==nd.getMonth()) {
                  nweekday++;
                  nd.setDate(nd.getDate()-7);
                }
                time.setMonth(time.getMonth()+repeat.amount);
                time.setDate(1);
                while (time.getDay()!=weekday) {
                  time.setDate(time.getDate()+1);
                }
                time.setDate(time.getDate()+7*(nweekday-1));
              }
              schedule.repetitiveTasks[i].timeid = time.getTime();
              schedule.repetitiveTasks[i].date = encodeDate(time);
              break;
            case "years":
              var time = new Date(schedule.repetitiveTasks[i].timeid);
              time.setFullYear(time.getFullYear()+repeat.amount);
              schedule.repetitiveTasks[i].timeid = time.getTime();
              schedule.repetitiveTasks[i].date = encodeDate(time);
              break;
            default:
              loginfo("????? coś nie tak z "+schedule.repetitiveTasks[i].id+", "+repeat.unit);
          }
        }

        var index = schedule.content.tasks.findIndex((obj) => {
          return obj.id == schedule.repetitiveTasks[i].id;
        });
        if (schedule.repetitiveTasks[i].exceptions) {
          for (exception in schedule.repetitiveTasks[i].exceptions) {
            if (schedule.repetitiveTasks[i].date == exception.olddate) {
              schedule.repetitiveTasks[i].date = exception.date;
              schedule.repetitiveTasks[i].timeid = exception.timeid;
            }
          }
        }

        if (!schedule.repetitiveTasks[i].exception) 
          schedule.content.tasks[index] = schedule.repetitiveTasks[i];
      }
    }

    return schedule.content.tasks.sort(function(a,b) {
      if (a.timeid > b.timeid) return 1
      else if (a.timeid < b.timeid) return -1
      else return 0
    });
  })(this);

  this.tasksByDate = (function(schedule) {
    var dates = {};
    for (var i=0;i<schedule.orderedList.length;i++) {
      var item = schedule.orderedList[i];
      if (item.repeat) continue;
      
      if (dates[item.date]) 
        dates[item.date].push(item);
      else 
        dates[item.date] = [item];
    }
    return dates;
  })(this);

  this.oldTasks = this.content.tasks.filter(obj => {
    return obj.timeid < this.date.getTime();
  });

  this.getUpcomingDeadlines = function (days) {
    var today = new Date();
    var upcomingdeadlines = [];
    for (var i = 0; i < (days+1); i++) {
      var day = new Date();
      day.setDate(today.getDate()+i);

      var dayschedule = this.getDaySchedule(encodeDate(day));
      if (dayschedule)
        upcomingdeadlines = upcomingdeadlines.concat(dayschedule);
    }

    return upcomingdeadlines;
  }

  this.updateDeadlines = function() {
    var days = 1;
    var upcomingdeadlines;

    var ds = [0,1,2,7,14,21,30];
    for (var i = 0; i < ds.length; i++) {
      days = ds[i];
      upcomingdeadlines = this.getUpcomingDeadlines(days);
      if (upcomingdeadlines.length) break;
    }

    var deadlinescount = upcomingdeadlines.length;

    upcomingdeadlines.forEach(function(elem) {
      if (elem.checked) {
        var i = upcomingdeadlines.findIndex((obj) => {
          return obj.id == elem.id
        });
        deadlinescount--;
      }
    });

    this.upcomingDeadlines = {
      tasks: upcomingdeadlines,
      dc: deadlinescount,
      days: days
    };

    renderTray(this.upcomingDeadlines);

    return this.upcomingDeadlines;
  }

  this.upcomingDeadlines = this.updateDeadlines();

  // this.otherTasks = this.orderedList.filter(obj => {
  //   return this.upcomingDeadlines.tasks.indexOf(obj) == -1
  // });

  this.otherTasks = (function(schedule){
    var deadlinesids = [];
    var otherTasks = JSON.parse(JSON.stringify(schedule.orderedList));
    schedule.upcomingDeadlines.tasks.map((task) => deadlinesids.push(task.id));

    for (id of deadlinesids) {
      var index = otherTasks.findIndex((task) => {return task.id == id});
      if (index>=0) otherTasks.splice(index,1);
    }
    return otherTasks;
  })(this);

  // this.remindTasks = this.content.tasks.filter(task => {
  //   return task.remind;
  // });

  this.remindTasks = (function(schedule){
    var remindTasks = [];
    var tasks = JSON.parse(JSON.stringify(schedule.content.tasks));
    for (task of tasks) 
      if (task.exceptions) 
        for (exception in task.exceptions) 
          tasks.push(task.exceptions[exception]);
        
    remindTasks = tasks.filter(function(obj) {return obj.remind && !obj.checked});

    //delete olddates
    var a = 0;
    var b = 0;
    do {
      a = Number(b);
      for (task of remindTasks) {
        if (task.exceptions) {
          for (exception in task.exceptions) {
            if (task.exceptions[exception].olddate == task.date) {
              var index;
              b++;
              // do {
                index = remindTasks.findIndex(function(obj) {
                  return obj.id == task.id
                });
                remindTasks.splice(index,1);
              // } while (index>=0);
            }
          }
        }
      }
    } while (a != b);
    return remindTasks;
  })(this);

  this.upcomingReminders = function() {
    return this.remindTasks.filter(task => {
      return !task.remind.opened; 
    });
  }

  this.checkForReminders = function() {
    var now = new Date();
    var reminders = this.upcomingReminders().filter(task => {
      var d = decodeDate(task.remind.reminddate);
      d = new Date(decodeTime(task.remind.remindtime, d));
      return d.getTime() < now.getTime();
    }) || [];

    return reminders;
  }

  this.updateTasks = function (newtasks) {
    if (newtasks) this.content.tasks = newtasks;
    fs.writeFileSync(this.info.tasks.path, JSON.stringify(this.content));
    console.log('saving new stuff');

    this.updateDeadlines();
  }

  this.addTask = function(task) {
    console.log(task);
    task.id = 0;
    this.content.tasks.forEach(function(obj){
        if (obj.id >= task.id) task.id = obj.id+1;
    });

    this.content.tasks.push(task);

    this.updateTasks();
    refreshUpdater();
    return task;
  }

  this.deleteTask = function(task) {
    console.log(task);
    var taskindex = this.content.tasks.findIndex(obj => {
      return obj.id == task.id
    });
    if (task.repeat || task.isException) {
      if (task.repeat)
        task.repeat.began = this.content.tasks[taskindex].repeat.began;
      var answer = dialog.showMessageBoxSync(mainwin, {
        type:"question", 
        title:"Zadanie cykliczne",
        message: "Wybierz, które zadania chcesz usunąć",
        buttons: ["Wszystkie zadania","Tylko to zadanie","To zadanie i wszystkie późniejsze"]
      });
      switch (answer) {
        case 0:
          // Wszystkie zadania
          this.content.tasks.splice(taskindex, 1);
          break;
        case 1:
          // Tylko to zadanie (onetime)
          var exception = task; // edytowane zadanie
          var oldtask = this.content.tasks[taskindex]; // rodzic no.1
          exception.repeat = false; // no bo jest onetime - nie powtórzy się
          exception.isException = true;
          exception.hide = true; // zamiast usuwania - ukrywanie
          exception.exceptions = {};
          exception.olddate = exception.date;

          exception.path = exception.path || []; // tworzymy ścieżkę dla wyjątku
          for (var i=0; i<exception.path.length;i++) 
            oldtask = oldtask.exceptions[exception.path[i]]; // oldtask to teraz zadanie, do którego doczepiamy wyjątek

          exception.path.push(exception.date); 

          oldtask.exceptions = oldtask.exceptions || {};
          oldtask.exceptions[exception.date] = exception;
          break;
        case 2:
          // To zadanie i wszystkie późniejsze
          var exception = task;
          var oldtask = this.content.tasks[taskindex];

          exception.path = exception.path || [];
          for (var i=0; i<exception.path.length;i++) 
            oldtask = oldtask.exceptions[exception.path[i]];

          var newend = decodeDate(exception.date);
          newend.setDate(newend.getDate()-1);
          oldtask.repeat.end = encodeDate(newend);

          oldtask.exceptions = {};
          break;
        default:
          console.log('umm delete repeat')
          break;
      }
    } else this.content.tasks.splice(taskindex, 1); // jeżeli zadanie się nie powtarza
  
    this.updateTasks();
    refreshUpdater();
  }
  
  this.editTask = function(task, repeatchoice) {
    console.log(task);
    var taskindex = this.content.tasks.findIndex(obj => {
      return obj.id == task.id
    });
    if (task.repeat || task.isException) {
      var answer;
      if (this.content.tasks[taskindex].repeat.began)
        task.repeat.began = this.content.tasks[taskindex].repeat.began;
      if (repeatchoice != undefined) answer = repeatchoice;
      else answer = dialog.showMessageBoxSync(mainwin, {
        type:"question", 
        title:"Zadanie cykliczne",
        message: "Wybierz, które zadania chcesz edytować",
        buttons: ["Wszystkie zadania","Tylko to zadanie","To zadanie i wszystkie późniejsze"]
      });
      switch (answer) {
        case 0:
          // Wszystkie zadania
          task.path = [];
          this.content.tasks[taskindex] = task;
          break;
        case 1:
          // Tylko to zadanie (onetime)
          var exception = task; // edytowane zadanie
          var oldtask = this.content.tasks[taskindex]; // rodzic no.1
          exception.repeat = false; // no bo jest onetime - nie powtórzy się
          exception.isException = true;

          exception.path = exception.path || []; // tworzymy ścieżkę dla wyjątku
          for (var i=0; i<exception.path.length;i++) 
            oldtask = oldtask.exceptions[exception.path[i]]; // oldtask to teraz zadanie, do którego doczepiamy wyjątek

          exception.path.push(exception.previousdate); 

          oldtask.exceptions = oldtask.exceptions || {};
          oldtask.exceptions[exception.previousdate] = exception;
          break;
        case 2:
          // To zadanie i wszystkie późniejsze
          var exception = task;
          var oldtask = this.content.tasks[taskindex];
          exception.isException = true;

          exception.path = exception.path || [];
          for (var i=0; i<exception.path.length;i++) 
            oldtask = oldtask.exceptions[exception.path[i]];

          exception.path.push(exception.previousdate);

          var newend = decodeDate(exception.previousdate)
          newend.setDate(newend.getDate()-1);
          oldtask.repeat.end = encodeDate(newend);
          if (exception.repeat)
            exception.repeat.began = exception.date;
          oldtask.date = oldtask.repeat.began;
          oldtask.timeid = decodeTime(oldtask.time,decodeDate(oldtask.repeat.began));

          oldtask.exceptions = {};
          oldtask.exceptions[exception.previousdate] = exception;
          break;
        default:
          console.log('umm edit repeat')
          break;
      }
    } else this.content.tasks[taskindex] = task; // jeżeli zadanie się nie powtarza

    this.updateTasks();
    refreshUpdater();
  }
}

// tray

function loadTray() {
  if (!tray)
    tray = new Tray(path.join(__dirname,"tray.ico"));
  // else {
  //  tray.destroy();
  //  tray = new Tray(path.join(__dirname,"tray.ico"));
  // }
  // tray = new Tray(nativeImage.createEmpty())
  // {label: 'Otwórz DevTools', click () {mainwin.webContents.openDevTools()}}
  var menu = [
    // {label: '🗄️ Archiwum'},
    {label: '⚙️ Ustawienia', click () {
      showMode("settings");
    }},
    {label: '➕ Dodaj nowe zadanie', click() {
      mainwin.show();
      mainwin.send("showform", ["add"]);
    }},
    {label: 'Wyjdź', click() {
      app.exit(0);
    }}
  ];

  if (settings.config.general.devtools) menu.unshift({label: 'Otwórz DevTools', click () {mainwin.webContents.openDevTools()}});

  var contextMenu = Menu.buildFromTemplate(menu);
  tray.setContextMenu(contextMenu);

  function trayclick() {
    if (!mainwin.isVisible())
      mainwin.show()
    else 
      mainwin.hide();
  }

  tray.removeAllListeners();
  tray.on('click', trayclick);
}

function renderTray(a) {
  var quantitytext = "";
  var daystext = "";
  switch (a.dc) {
    case 0:
      quantitytext = "Brak zadań";
      break;
    case 1:
      quantitytext = "1 zadanie";
      break;
    case 2:
    case 3:
    case 4:
      quantitytext = a.dc + " zadania";
      break;
    default:
      quantitytext = a.dc + " zadań"
  }
  switch (a.days) {
    case 0:
      daystext = "na dzisiaj";
      break;
    case 1:
      daystext = "na jutro";
      break;
    case 2:
      daystext = "na pojutrze";
      break;
    case 7:
      daystext = "w przeciągu tygodnia";
      break;
    case 14:
      daystext = "w przeciągu 2 tygodni";
      break;
    case 21:
      daystext = "w przeciągu 3 tygodni";
      break;
    default:
      daystext = "w przeciągu " + (a.days) + " dni"
  }

  tray.setToolTip(
    'Deadlines\n\
    '+quantitytext+' do wykonania '+daystext
    // +'\nPrzypomnienie o 17:00'
  );
}

// modes

function showWindow(settings, filename, silent) {
	var win = new BrowserWindow(settings);
	
	win.loadURL(url.format({
	  pathname: path.join(__dirname, filename),
	  protocol: 'file:',
	  slashes: true
	}));
  win.setMenuBarVisibility(false);


	win.once('ready-to-show', () => {
  	if (!silent) win.show();
    sendSchedule(win);
  	//debug
  	// win.openDevTools()
	});

  return win;
}

function showMode(mode, silent){
  switch (mode) {
    case "settings":
      if (settingswin)
        if (settingswin.isVisible()) return;
      settingswin = showWindow({
        parent: mainwin,
        modal: true,
        height: 600,
        width: 700,
        show: false,
        webPreferences: {
          nodeIntegration: true
        }
      },'settings.html');
      settingswin.once("closed", function(event) {
        settingswin = null
      });
      settingswin.once("close", function(event) {
        mainwin.close();
        settingsHandler();
        loadTray();
        showMode(settings.config.general.default_mode);
      });
      break;
    case "list":
      if (mainwin) {
        mainwin.removeAllListeners();
        mainwin.close();
      }
      settings.current.mode = "list";

      mainwin = showWindow({...settings.computed.display_app_corner.list, ...{
        height: 600,
        width: 400,
        webPreferences: {
          nodeIntegration: true
        },
        resizable: false,
        show: false,
        movable: settings.config.general.movable,
        alwaysOnTop:settings.config.general.always_on_top,
        frame: false,
        skipTaskbar: true,
        title: "Deadlines"
      }},"index.html",silent);
    
      mainwin.once('ready-to-show', () => {
        refreshUpdater();
        loadTray();
      });
      mainwin.on("blur", function() {hideWindowOnBlur(mainwin)});

      mainwin.on('close', (event) => {
        event.preventDefault();
        mainwin.hide();
      });
      break;
    case "calendar":
      if (mainwin) {
        mainwin.removeAllListeners();
        mainwin.close();
      }
      settings.current.mode = "calendar";

      mainwin = showWindow({...settings.computed.display_app_corner.calendar, ...{
        height: 600,
        width: 800,
        webPreferences: {
          nodeIntegration: true
        },
        resizable: false,
        show: false,
        movable: settings.config.general.movable,
        alwaysOnTop:settings.config.general.always_on_top,
        frame: false,
        skipTaskbar: true,
        title: "Deadlines"
      }}, "calendar.html", silent);
    
      mainwin.once('ready-to-show', () => {
        refreshUpdater();
        loadTray();
      });
      mainwin.on("blur", function() {hideWindowOnBlur(mainwin)});

      mainwin.on('close', (event) => {
        event.preventDefault();
        mainwin.hide();
      });
      break;
    case "reminders":
      if (reminderswin)
        if (reminderswin.isVisible()) return;
      reminderswin = showWindow({
        parent: mainwin,
        modal: true,
        height: 400,
        width: 500,
        "min-width": 500,
        show: false,
        resizable: false,
        webPreferences: {
          nodeIntegration: true
        }
      },'reminders.html');
      reminderswin.once("closed", function(event) {
        reminderswin = null
      });
      break;
    default:
      console.log("there is no mode like "+mode);
      break;
  }
}

function getXYCorner(height,width) {
  var size = screen.getPrimaryDisplay().workArea;
  return {
    "rightdown": {x: size.x+size.width-width,y: size.y+size.height-height},
    "rightup": {x: size.x+size.width-width,y: size.y},
    "leftdown": {x: size.x,y: size.y+size.height-height},
    "leftup": {x: size.x,y: size.y}
  }
}

function sendSchedule(win) {
  win.send("schedule", JSON.stringify(schedule));
}

function refreshUpdater() {
  if (updater) clearInterval(updater);
  function checkReminders () {
    var reminders = schedule.checkForReminders();
    if(!reminders.length) return false;
    // ... display popups
    console.log('show reminders');
    showMode("reminders");
    reminders.forEach(function(reminder, index) {
      if (reminder.path == 0) {
        var index = schedule.content.tasks.findIndex(function(item) {
          return item.path.length === reminder.path.length && item.path.every((value, index) => value === reminder.path[index])
        });
        console.log(index);
        if (index != -1) schedule.content.tasks[index].remind.opened = true;
        else return;
      } else {
        var index = schedule.content.tasks.findIndex(function(item) {
          return item.id === reminder.id;
        });
        var task = schedule.content.tasks[index];
        if (index == -1) return;
        for (step of reminder.path)
          task = task.exceptions[step];

        task.remind.opened = true;
      }
      if (index == -1) console.log('reminder error: cant find reminder in schedule content tasks');

      index = schedule.remindTasks.findIndex(function(item) {
        return item.id == reminder.id && item.exceptions == reminder.exceptions;
      });
      console.log(index);
      schedule.remindTasks[index].remind.opened = true;
    });
    reminderswin.on("ready-to-show",function() {
      reminderswin.send("reminders", JSON.stringify(reminders));
    });
    schedule.updateTasks();
  }

  updater = setInterval(function() {
    var newschedule = new Schedule(schedulelist[0], schedule.content);
    if (schedule.info.tasks.jsontxt != newschedule.info.tasks.jsontxt){
      console.log('new schedule');
      schedule = newschedule;
      sendSchedule(mainwin);
    }
    checkReminders();
  }, updatetime);
  schedule = new Schedule(schedulelist[0], schedule.content);
  sendSchedule(mainwin);
}

function alertme(win, context) {
  if (win)
    dialog.showMessageBox(win, {type:"info", message:context});
  else
    dialog.showMessageBox({type:"info", message:context});
}
