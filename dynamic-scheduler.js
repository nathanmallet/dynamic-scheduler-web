//-- GLOBAL --//
let schedule = {
    taskArr: [],
    startTime: 6.5 * 60 * 60,
    endTime: 22.5 * 60 * 60,
    get totalTime() {
        return this.endTime - this.startTime;
    },
    popup: null,
}

let debug = true;
let fakeTime = schedule.startTime;

function setupCanvas() {
    // Timeline canvas
    let canvas = document.getElementById("timelineCanvas");
    canvas.height = canvas.offsetHeight;
    canvas.width = canvas.offsetWidth;

    // Time markers
    let marker = document.getElementById("timeMarker");
    let start = document.getElementById("startMarker");
    let stop = document.getElementById("stopMarker");
    let end = document.getElementById("finishMarker");
    let sched = document.getElementById("schedule");

    marker.style.width = sched.offsetWidth + 'px';
    start.style.width = sched.offsetWidth + 'px';
    stop.style.width = sched.offsetWidth + 'px';
    end.style.width = sched.offsetWidth + 'px';

    // Menus
    let menu = document.getElementById("addMenu");
    menu.style.top = 40 + 'px';
    let edit = document.getElementById("editMenu");
    edit.style.top = 40 + 'px';

}

//-- Utility --//
function getNow() {
    if (debug) {
        return fakeTime;
    }

    // Time in seconds since the start of the day
    let date = new Date();
    return (+date.getHours() * 3600) + (+date.getMinutes() * 60) + +date.getSeconds();
}

function secToPx(sec) {
    // Number of seconds to canvas pixel size
    let canvas = document.getElementById("timelineCanvas");
    return (canvas.offsetHeight / (24 * 60 * 60)) * sec;
}

function getTaskObjFromElem(elem) {
    for (let task of schedule.taskArr) {
        if (task.elem == elem) return task;
    }
}

function getDowntimeTotal() {
    let total = 0;
    for (let task of schedule.taskArr) {
        if (task.downtime) total += task.duration;
    }
    return total;
}

function getOvertimeTotal() {
    let total = 0;
    for (let task of schedule.taskArr) {
        if (task.overtime) total += task.duration;
    }
    return total;
}

function secToTimestamp(sec, res, form) {
    if (sec == 0) {
        if (res == 'min') {
            return "00:00";
        } else if (res == 'sec') {
            return "00:00:00";
        }
    }

    let hours = Math.floor(sec / 3600);
    if (hours < 10) hours = '0' + hours;
    // Minutes
    let minutes = Math.floor((sec - (hours * 3600)) / 60);
    if (minutes < 10) minutes = '0' + minutes;
    // Seconds
    let seconds = sec - (hours*3600) - (minutes*60);
    if (seconds < 10) seconds = '0' + seconds;

    // Time format
    let outSuffix = '';
    if (form == "ampm") {
        if (hours > 12) {
            hours = hours - 12;
            outSuffix = " PM";
        } else {
            outSuffix = " AM";
        }
    }

    // Resolution
    let outString;
    if (res == 'min') {
        outString = `${hours}:${minutes}`;
    } else if (res == 'sec') {
        outString = `${hours}:${minutes}:${seconds}`;
    }    

    return outString + outSuffix;
}

function getEditIndex() {
    for (let task of schedule.taskArr) {
        if (task.edit == true) return schedule.taskArr.indexOf(task);
    }
    return -1;
}

function swapTask(index, dir) {

    // Do not exceed taskArr bounds, prevent swapping of active head task
    if ((dir == 1 && index == schedule.taskArr.length - 1)  || (dir == -1 && (index == getHeadIndex() || schedule.taskArr[index + dir].active))) {
        return;
    }  

    let base = Object.assign({}, schedule.taskArr[index]);
    let temp = Object.assign({}, schedule.taskArr[index + dir]);

    // Handle swapping of head task
    if (base.head) {
        base.head = false;
        temp.head = true;
    } else if (temp.head) {
        temp.head = false;
        base.head = true;
    }

    Object.assign(schedule.taskArr[index + dir], base);
    Object.assign(schedule.taskArr[index], temp);
}

function swapEdit(index, dir) {

    // Do not exceed taskArr bounds, prevent swapping of active head task
    if ((dir == 1 && index == schedule.taskArr.length - 1)  || (dir == -1 && (index == getHeadIndex() || schedule.taskArr[index + dir].active))) {
        return;
    }  
    schedule.taskArr[index].edit = false;
    schedule.taskArr[index].elem.classList.remove("editTask"); 
    schedule.taskArr[index + dir].edit = true;
    schedule.taskArr[index + dir].elem.classList.add("editTask");
}

function getHeadIndex() {
    for (let task of schedule.taskArr) {
        if (task.head == true) return schedule.taskArr.indexOf(task);
    }
    return null;
}

function updateDisplayName(task) {
    let segmented = task.segTotal > 1;
    let displayName;
    let now = getNow();

    // Potential displayName elements
    let segMarker = `${task.segPos} / ${task.segTotal}`;
    let finishTimestamp = `${secToTimestamp(task.start, 'min', '24hour')}-${secToTimestamp(task.end, 'min', '24hour')}`;
    let activeTimestamp = secToTimestamp(task.end - now, 'sec', '24hour');
    
    if (segmented && task.finished) {
        // name + start-finish + segment marker
        displayName = task.name + ' ' + finishTimestamp + ' ' + segMarker;
    } else if (segmented && task.active) {
        // name + countdown + segment marker
        displayName = task.name + ' ' + activeTimestamp + ' ' + segMarker;
    } else if (segmented) {
        // name + segment marker
        displayName = task.name + ' ' + segMarker;
    } else {
        // name
        displayName = task.name;
    }
    task.displayName = displayName;
    task.elem.innerText = displayName;
}

function updateSegCount(task) {
    let pos = 1;
    let prev = task.prevSegment;
    while (prev) {
        pos++;
        prev = prev.prevSegment;
    }

    let total = pos;
    let next = task.nextSegment;
    while (next) {
        total++;
        next = next.nextSegment;
    }

    task.segPos = pos;
    task.segTotal = total;

    updateDisplayName(task);
}

//-- Drawing --//
function markTimeline(time, length) {
    let canvas = document.getElementById("timelineCanvas");
    let ctx = canvas.getContext('2d');
    let lineY = secToPx(time * 60);
    ctx.beginPath();
    ctx.moveTo(0, lineY);
    ctx.lineTo(length, lineY);
    ctx.lineWidth = 1;
    ctx.stroke();
}

function markTimestamp(time, length) {
    let canvas = document.getElementById("timelineCanvas");
    let ctx = canvas.getContext('2d');
    let fontSize = 10;
    ctx.font = `${fontSize}px serif`
    ctx.fillText(secToTimestamp(time * 60, "min", "ampm"), length + 5, secToPx(time * 60) + (fontSize / 4));
}

function drawTimeline() {
    for (let i = 0; i < 24 * 60; i += 15) {    
        if(i == 0) continue;
        
        if(i % 60 == 0) {
            markTimeline(i, 20);
            markTimestamp(i, 20);
        } else if (i % 30 == 0) {
            markTimeline(i, 10);
        } else if (i % 15 == 0) {
            markTimeline(i, 5);
        }
    }
}

// -- Update Functions --//
function updateMarkers() {
    let marker = document.getElementById("timeMarker");
    let tasklineTop = document.getElementById("timelineCanvas").getBoundingClientRect().top;
    marker.style.top = tasklineTop + window.scrollY + secToPx(getNow()) + 'px';

    // Draw schedule start and stop
    let start = document.getElementById("startMarker");
    start.style.top = tasklineTop + window.scrollY + secToPx(schedule.startTime) + 'px';
    let stop = document.getElementById("stopMarker");
    stop.style.top = tasklineTop + window.scrollY + secToPx(schedule.endTime) + 'px';

    // Draw projected finish of final task
    let finish = document.getElementById("finishMarker");
    if (schedule.taskArr.length == 0) {
        finish.style.visibility = 'hidden';
        return;
    }
   
    let finalTask = schedule.taskArr[schedule.taskArr.length - 1];
    if (finalTask.finished || finalTask.downtime) {
        finish.style.visibility = 'hidden';
    } else {
        finish.style.visibility = 'visible';
        finish.style.top = tasklineTop + window.scrollY + secToPx(finalTask.end) + 'px';
    }
    // Write timestamp of estimated finish
    finish.innerText = secToTimestamp(finalTask.end, 'min', 'ampm');

}

function updateTasks() {
    let first = true;
    let newDowntime = null;
    let downtimeIndex = 0;
    let now = getNow();

    for (let task of schedule.taskArr) {
        if (first && !task.downtime && !task.finished) {
            // In case of head task removal, assign new head
            task.head = true;
            first = false;
        }

        if(task.finished || task.downtime) {
            continue;
        } else if(task.active) {
            if (task.overtime) {
                // Elongate our overtime block as we go, deactivate is via popup only
                overtimeDur = now - task.start;
                task.duration = overtimeDur;                
                task.elem.style.height = secToPx(overtimeDur) + 'px';
                continue;

            } else if(task.activeStart + task.duration < now) {
                // Check if we have surpassed limit to transition to "finished" state
                let index = schedule.taskArr.indexOf(task);
                // Check for overtime flag
                if(task.allowOT) {
                    let taskBlock = document.createElement('div');
                    taskBlock.className = "taskBlock";
                    taskBlock.classList.add("overtimeTask");
                    taskBlock.style.position = 'absolute';

                    let overtimeStart = task.end;
                    let overtimeDur = 0
                    taskBlock.style.height = secToPx(overtimeDur) + "px";
                    taskBlock.style.top = secToPx(overtimeStart) + 'px';

                    let tasklineElem = document.getElementById("taskline");
                    tasklineElem.append(taskBlock);
                    let taskObj = new Task(task.name, overtimeStart, overtimeDur, taskBlock);
                    // Insert directly after, and make immediately active
                    schedule.taskArr.splice(index + 1, 0, taskObj);
                    taskObj.active = true;
                    taskObj.overtime = true;
                }

                finishTask(task);
                if (schedule.taskArr.length-1 > index) schedule.taskArr[index + 1].head = true;

                continue;
            }

            // Write a countdown till finish in active tasks
            // task.elem.innerText = `${task.name} - ${secToTimestamp(task.end - now, 'sec', '24hour')}`;
            updateDisplayName(task);
            
        } else if(task.head) {
            task.start = now;
            task.elem.style.top = secToPx(task.start) + 'px';

            let index = schedule.taskArr.indexOf(task);
            // If preceding downtime block doesn't yet exist and we are past the schedule start time
            if (task.start > schedule.startTime && (index == 0 || schedule.taskArr[index - 1].downtime == false)) {
                // New downtime task block
                let taskBlock = document.createElement('div');
                taskBlock.className = "taskBlock";
                taskBlock.classList.add("downtimeTask");
                taskBlock.style.position = 'absolute';

                // TODO: Inner text should only appear when block is large enough to contain it
                // taskBlock.innerText = "Down Time";

                let downtimeDur;
                let downtimeStart;
                if (index == 0 || schedule.taskArr[index - 1].end < schedule.startTime) {
                    // Downtime for tasks with no previous tasks, is from schedule start time
                    downtimeStart = schedule.startTime;
                } else {
                    // Regular downtime measurement, between current task start and previous finished task
                    downtimeStart = schedule.taskArr[index - 1].end;
                }
                downtimeDur = task.start - downtimeStart;
                taskBlock.style.height = secToPx(downtimeDur) + "px";
                taskBlock.style.top = secToPx(downtimeStart) + 'px';

                let tasklineElem = document.getElementById("taskline");
                tasklineElem.append(taskBlock);
                let taskObj = new Task("Down Time", downtimeStart, downtimeDur, taskBlock);
                taskObj.downtime = true;
                newDowntime = taskObj;
                downtimeIndex = index;
            } else if (task.start > schedule.startTime && schedule.taskArr[index - 1].downtime) {
                // Elongate downtime block while task head remains inactive
                // Limited growth until schedule end limit, after which tasks aren't activateable anyway
                let downtimeEnd = Math.min(task.start, schedule.endTime);
                let downtimeDur = downtimeEnd - schedule.taskArr[index - 1].start;
                schedule.taskArr[index - 1].duration = downtimeDur;
                schedule.taskArr[index - 1].elem.style.height = secToPx(downtimeDur) + 'px';
            }
            
        } else {
            task.start = schedule.taskArr[schedule.taskArr.indexOf(task) - 1].end;
            task.elem.style.top = secToPx(task.start) + 'px';
        }
    }

    if (newDowntime) {
        // TODO: This should be async instead
        schedule.taskArr.splice(downtimeIndex, 0, newDowntime);
    }
}

function updateCount() {
    document.getElementById("downtimeCount").innerText = secToTimestamp(getDowntimeTotal(), 'sec', '24hour');
    document.getElementById("overtimeCount").innerText = secToTimestamp(getOvertimeTotal(), 'sec', '24hour');

}

// Task object type
class Task {
    constructor(name, start, duration, elem) {
        // Variables
        this.name = name;
        this.displayName = name;
        this.start = start;
        this.duration = duration;
        this.elem = elem;
        this.activeStart = 0;

        // Segmenting
        this.prevSegment = null;
        this.nextSegment = null;
        this.segPos = 0;
        this.segTotal = 0;

        // States
        this.head = false;
        this.active = false;
        this.finished = false;
        this.downtime = false;
        this.allowOT = false;
        this.overtime = false;
        this.edit = false;
    }

    get end() {
        return this.start + this.duration;
    }

}

function createTask(name, start, dur) {
    let taskBlock = document.createElement('div');
    taskBlock.className = "taskBlock";
    // taskBlock.innerText = name;
    taskBlock.style.position = 'absolute';
    taskBlock.style.height = secToPx(dur) + "px";

    // Task block vertical alignment
    taskBlock.style.top = secToPx(start) + 'px';

    // Append to the taskline element and ledger of current tasks
    let tasklineElem = document.getElementById("taskline");
    tasklineElem.append(taskBlock);
    let taskObj =  new Task(name, start, dur, taskBlock);    
    updateDisplayName(taskObj);
    return taskObj;
}

function finishTask(task) {
    task.finished = true;
    task.head = false;
    task.active = false;
    task.elem.classList.remove("activeTask");
    task.elem.classList.add("finishedTask");
    // task.elem.innerText = `${task.name}\t${secToTimestamp(task.start, 'min', '24hour')}-${secToTimestamp(task.end, 'min', '24hour')}`;
    updateDisplayName(task);
}

//-- Event Handlers --//
function initAddMenuHandler() {
    let addElem = document.getElementById("addButton");
    addElem.onclick = function() {
        if (schedule.popup) {
            schedule.popup.style.visibility = 'hidden';
        }
        let addMenuElem = document.getElementById("addMenu");
        addMenuElem.style.visibility = 'visible';
        schedule.popup = addMenuElem;
    }
}

function initAddFormHandler() {
    let form = document.forms.addForm
    form.onsubmit = function() {
        let taskName = form.elements.taskName.value;
        // Input as minutes, convert to seconds
        let taskDur = +form.elements.taskDur.value * 60;

        // Calculate task position details
        let taskStart;
        let taskHead;
        if (schedule.taskArr.length == 0 || schedule.taskArr[schedule.taskArr.length-1].finished) {
            taskStart = getNow(); 
            taskHead = true;
        } else {
            taskStart = schedule.taskArr[schedule.taskArr.length - 1].end;
            taskHead = false;
        }

        // Create new task, assign details
        let newTask = createTask(taskName, taskStart, taskDur);
        newTask.head = taskHead;
        newTask.elem.style.top = secToPx(taskStart) + 'px';

        // Append to the taskline element and ledger of current tasks
        let tasklineElem = document.getElementById("taskline");
        tasklineElem.append(newTask.elem);
        schedule.taskArr.push(newTask);

        // Prevent default (unwanted page reload)
        return false;
    }

    let addTaskCancel = document.getElementById("addTaskCancel");
    addTaskCancel.onclick = function() {
        document.getElementById("addMenu").style.visibility = 'hidden';
        schedule.popup = null;
    }
}

function initEditFormHandler() {
    let form = document.forms.editForm;
    form.onsubmit = function() {
        let taskName = form.elements.taskName.value;
        // Input as minutes, convert to seconds
        let taskDur = +form.elements.taskDur.value * 60;

        let targetObj = schedule.taskArr[getEditIndex()];
        
        // Update name field
        if (taskName != '') {
            targetObj.name = taskName;
            // targetObj.elem.innerText = taskName;
            updateDisplayName(targetObj);
        }
       
        // Update duration field
        // TODO: Allow edit of head/active task, but cannot reduce duration lower than current point in time
        if (taskDur != '') {
            targetObj.duration = taskDur;
            targetObj.elem.style.height = secToPx(taskDur) + 'px';
        }

        // Turn off edit flag
        targetObj.edit = false;

        // Hide edit menu after submit
        document.getElementById("editMenu").style.visibility = 'hidden';
        schedule.popup = null;

        // Prevent default (unwanted page reload)
        return false;
    }

    let editTaskCancel = document.getElementById("editTaskCancel");
    editTaskCancel.onclick = function() {
        document.getElementById("editMenu").style.visibility = 'hidden';
        schedule.popup = null;

        let targetObj = schedule.taskArr[getEditIndex()];

        // Turn off edit flag
        targetObj.edit = false;
    }
}

function moveKeyListener(e) {
    let index = getEditIndex();
    switch (e.code) {
        case "ArrowUp":
            swapTask(index, -1);
            break;
        case "ArrowDown":
            swapTask(index, 1);
            break;
        case "ArrowLeft":
            swapEdit(index, -1);
            break;
        case "ArrowRight":
            swapEdit(index, 1);
            break;
        case "Space":
            // Space to exit "edit" mode
            let editTask = schedule.taskArr[index]
            editTask.edit = false;
            editTask.elem.classList.remove("editTask");
            document.removeEventListener('keydown', moveKeyListener);
            break;
    }
}

function initPopupHandler() {
    let tasklineElem = document.getElementById("taskline");
    tasklineElem.addEventListener('click', function(e) {
        // NOTE: Be careful if you add more types of divs to the taskline area, we'll trigger this event
        let target = e.target.closest('div');
        if (!target) return;
        let targetObj =  getTaskObjFromElem(target);
        let targetIndex = schedule.taskArr.indexOf(targetObj);

        // Finished/Downtime tasks require no further actions
        if (targetObj.finished || targetObj.downtime) return;

        // Create new popup div
        let popup = document.createElement('div');
        popup.className = "popup";
        popup.style.position = "absolute";

        if (schedule.popup) {
            if (schedule.popup.classList.contains("taskMenu")) {
                schedule.popup.remove();
            } else {
                schedule.popup.style.visibility = 'hidden';
            }
        }
        schedule.popup = popup;

        // Move the popup to click position and display
        let tlBox = tasklineElem.getBoundingClientRect();
        popup.style.top = e.clientY - tlBox.top + 'px';
        popup.style.left = e.clientX - tlBox.left + 'px';
        tasklineElem.append(popup);

        if(!targetObj.overtime) {

            if(targetObj.head) {
                if(!targetObj.active) {
                    // Activate button
                    let activate = document.createElement('input');
                    activate.type = "button";
                    activate.value = "Activate";
                    popup.append(activate);

                    activate.addEventListener('click', function() {
                        targetObj.active = true;
                        targetObj.activeStart = getNow();
                        targetObj.elem.classList.add("activeTask");
                        activate.remove();
                        popup.remove();
                        schedule.popup = null;
                    })
                }
                else {
                    // Deactivate button
                    let deactivate = document.createElement('input');
                    deactivate.type = "button";
                    deactivate.value = "Deactivate";
                    popup.append(deactivate);

                    deactivate.addEventListener('click', function() {
                        targetObj.active = false;
                        targetObj.elem.classList.remove("activeTask");
                        deactivate.remove();
                        popup.remove();
                        schedule.popup = null;

                        // Split unfinished time into a new task block
                        let index  = schedule.taskArr.indexOf(targetObj);
                        let now = getNow();
                        
                        // Calculate unfinished duration before we edit targetObj.duration
                        let unfinishDur = targetObj.end - now;

                        // Finish active task
                        targetObj.duration = now - targetObj.start;
                        targetObj.elem.style.height = secToPx(targetObj.duration) + 'px';
                        finishTask(targetObj);

                        // Add new task for unfinished time
                        let unfinishObj = createTask(targetObj.name, now, unfinishDur);
                        unfinishObj.prevSegment = targetObj;
                        targetObj.nextSegment = unfinishObj;
                        unfinishObj.head = true;

                        // Update segment information
                        updateSegCount(targetObj);
                        updateSegCount(unfinishObj);

                        // Update segment info for finished tasks (e.g. > 1 splits)
                        let prev = targetObj.prevSegment;
                        while (prev) {
                            updateSegCount(prev);
                            prev = prev.prevSegment;
                        }

                        // Splice into taskArr
                        schedule.taskArr.splice(index + 1, 0, unfinishObj);
                    })
                }
            }

            let editIndex = getEditIndex();
            if (!targetObj.active && editIndex == -1 || editIndex == targetIndex) {
                if (!targetObj.edit) {
                    // Edit Mode button
                    let editMode = document.createElement('input');
                    editMode.type = "button";
                    editMode.value = "Edit Mode";
                    popup.append(editMode);
                    
                    // TODO: Edit mode
                    // 1. Double click name to edit name
                    // 2. Duration edit via drag? (in "edit" mode)
                    // 3. Click and drag in "edit" mode

                    editMode.addEventListener('click', function() {                    
                        targetObj.edit = true;
                        editMode.remove();
                        popup.remove();
                        schedule.popup = null;
                        target.classList.add("editTask");
                        document.addEventListener('keydown', moveKeyListener);           
                    })
                } else {
                    // Done button
                    let done = document.createElement('input');
                    done.type = "button";
                    done.value = "Exit Edit Mode";
                    popup.append(done);

                    done.addEventListener('click', function() {
                        targetObj.edit = false;
                        target.classList.remove("editTask");
                        done.remove();
                        popup.remove();
                        schedule.popup = null;
                        document.removeEventListener('keydown', moveKeyListener);
                    })
                }
            }

            // Edit Details Button
            let editDetails = document.createElement('input');
            editDetails.type = "button";
            editDetails.value = "Edit Details";
            popup.append(editDetails);

            editDetails.addEventListener('click', function() {
                editDetails.remove();
                popup.remove();
                let editMenuElem = document.getElementById("editMenu");
                editMenuElem.style.visibility = 'visible';
                schedule.popup = editMenuElem;
                targetObj.edit = true;
            })

            // Overtime Activate/Deactivate buttons
            if(!targetObj.allowOT) {
                let allow = document.createElement('input');
                allow.type = "button";
                allow.value = "Allow OT";
                popup.append(allow);

                allow.addEventListener('click', function() {
                    allow.remove();
                    popup.remove();
                    schedule.popup = null;
                    targetObj.allowOT = true;
                });
            } else {
                let disallow = document.createElement('input');
                disallow.type = "button";
                disallow.value = "Disallow OT";
                popup.append(disallow);

                disallow.addEventListener('click', function() {
                    disallow.remove();
                    popup.remove();
                    schedule.popup = null;
                    targetObj.allowOT = false;
                });
            }
        }

        if (!targetObj.active) {
            // Remove button
            let remove = document.createElement('input');
            remove.type = "button";
            remove.value = "Remove";
            popup.append(remove);

            remove.addEventListener('click', function() {
                target.remove();
                remove.remove();
                popup.remove();
                schedule.popup = null;
                for (let task of schedule.taskArr) {
                    if (target == task.elem) {
                        schedule.taskArr.splice(targetIndex, 1);
                    }
                }
            });
        } else {
            // Finish button (stop an active task early)
            let finish = document.createElement('input');
            finish.type = "button";
            finish.value = "Finish";
            popup.append(finish);

            finish.addEventListener('click', function() {
                finish.remove();
                popup.remove();
                schedule.popup = null;
                targetObj.duration = getNow() - targetObj.start;
                targetObj.elem.style.height = secToPx(targetObj.duration) + 'px';
                finishTask(targetObj);
            });
        }

        // Cancel Button
        let cancel = document.createElement('input');
        cancel.type = "button";
        cancel.value = "Cancel";
        popup.append(cancel);

        cancel.addEventListener('click', function() {
            cancel.remove();
            popup.remove();
            schedule.popup = null;
        })
    });
}

function initEscapeHandler() {
    document.addEventListener('keydown', function(e) {
        if (e.code == "Escape" && schedule.popup) {
            schedule.popup.style.visibility = "hidden";
            schedule.popup = null;
        }
    })
}

function initDebugHandler() {
    document.addEventListener('keydown', function(e) {
        if (e.key == 'j') {
            fakeTime += (15 * 60);
        } else if (e.key == 'k') {
            fakeTime -= (15 * 60);
        }
    })
}

function initEventHandlers() {
    initAddMenuHandler();
    initAddFormHandler();
    initEditFormHandler();
    initPopupHandler();
    initEscapeHandler();

    if (debug) initDebugHandler();
}

function updateEvents() {
    updateMarkers();
    updateTasks();
    updateCount();
    setTimeout(updateEvents, "100");
}

//-- Program entry --//
setupCanvas();
drawTimeline();
initEventHandlers();

//-- Program Loop --//
updateEvents();

//-- Cleanup --//