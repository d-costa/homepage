class JustLooksLikeCircularBuffer {
    constructor(maxSize) {
        this.maxSize = maxSize;
        this.size = 0;
        this.head = null;
        this.tail = null;
    }

    add() {
        if (this.tail === null) {
            this.tail = 0;
            this.head = 0;
        } else {
            this.tail = (this.tail + 1) % this.maxSize;
            if (this.tail === this.head)
                this.head = (this.head + 1) % this.maxSize;
        }

        if (this.size < this.maxSize)
            this.size++;
    }

    addArr(objArr) {
        objArr.forEach(_ => this.add());
    }
}

const SIZEOF_FLOAT = 4;

const EXPLOSION_PRECISION_MIN = 50;
const EXPLOSION_PRECISION_MAX = 250;

const DEFAULT_POINT_SIZE = 10.0;
const GRAVITY = -1;
const VELOCITY_FACTOR = 2;
const GROUPS = 5;

const TRAIL_PER_TIME = 0.01;
const TRAIL_PRECISION = 5;
const TRAIL_X_DELTA = 0.1;
const TRAIL_SIZE = DEFAULT_POINT_SIZE / 4;

const AUTO_MODE_MIN_TIME_INTERVAL = 150;
const AUTO_MODE_MAX_TIME_INTERVAL = 450;
const AUTO_MODE_INIT_MIN_X = -0.7;
const AUTO_MODE_INIT_MAX_X = 0.7;
const AUTO_MODE_INIT_Y = -0.5;
const AUTO_MODE_FINAL_X_DELTA = 0.05;
const AUTO_MODE_FINAL_MIN_Y = -1.3;
const AUTO_MODE_FINAL_MAX_Y = -1.0;

let gl;
let canvas;

const OFF_SCREEN_POINT = vec2(-10.0, -10.0);
let pressingMouseRightButton = false;
let autoMode = false;
let initPoint = OFF_SCREEN_POINT;
let finalPoint = OFF_SCREEN_POINT;

let programLine;
let bufferLine;
let vLinePosition;

let programGhostPoint;
let bufferGhostPoint;
let vGhostPointPosition;
let vGhostPointSize;

let programPoints;
let bufferPoints;
let vFirstPos;
let vFirstVel;
let vFirstTime;
let vSecondPos;
let vSecondVel;
let vSecondTime;
let vThirdPos;
let vThirdVel;
let vThirdTime;
let vSize;
let vColor;
let timeLoc;

let programTrails;
let bufferTrails;
let vTrailPos;
let vTrailVel;
let vTrailTime;
let vTrailSize;
let trailTimeLoc;

const MAX_OBJECTS = 65000 / 2;
const POINTS_ATT_PER_BLOCK = 20;
let circularAttributeBuffer = new JustLooksLikeCircularBuffer(MAX_OBJECTS * POINTS_ATT_PER_BLOCK);
const TRAILS_ATT_PER_BLOCK = 6;
let circularTrailsBuffer = new JustLooksLikeCircularBuffer((MAX_OBJECTS * TRAILS_ATT_PER_BLOCK));

let time = 0;

window.onload = function init() {

    // Configure canvas
    canvas = document.getElementById("canvas");

    let resizeTimeout;
    function resizeCanvas() {
        clearTimeout(resizeTimeout);
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        resizeTimeout = setTimeout(resizeCanvas, 500);
    }

    window.addEventListener("keydown", function (event) {
        if (event.code === "Space") {
            autoMode = !autoMode;
            auto();
        }
    });

    window.addEventListener('resize', resizeCanvas, false);

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    // Configure WebGL
    resizeCanvas();
    // gl.clearColor(0.055, 0.055, 0.055, 1.0);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.DST_ALPHA, gl.ONE, gl.ONE);
    gl.enable(gl.BLEND);

    // Line
    programLine = initShaders(gl, "vertex-shader-line", "fragment-shader-line");
    gl.useProgram(programLine);

    bufferLine = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferLine);

    vLinePosition = gl.getAttribLocation(programLine, "vLinePosition");
    gl.enableVertexAttribArray(vLinePosition);

    // Ghost Point
    programGhostPoint = initShaders(gl, "vertex-shader-ghost-point", "fragment-shader-ghost-point");
    gl.useProgram(programGhostPoint);

    bufferGhostPoint = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferGhostPoint);

    vGhostPointPosition = gl.getAttribLocation(programGhostPoint, "vGhostPointPosition");
    gl.enableVertexAttribArray(vGhostPointPosition);
    vGhostPointSize = gl.getAttribLocation(programGhostPoint, "vGhostPointSize");
    gl.enableVertexAttribArray(vGhostPointSize);

    // Points
    programPoints = initShaders(gl, "vertex-shader-point", "fragment-shader-point");
    gl.useProgram(programPoints);

    bufferPoints = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferPoints);
    gl.bufferData(gl.ARRAY_BUFFER, circularAttributeBuffer.maxSize * SIZEOF_FLOAT, gl.STATIC_DRAW);

    vFirstPos = gl.getAttribLocation(programPoints, "vFirstPos");
    gl.enableVertexAttribArray(vFirstPos);
    vFirstVel = gl.getAttribLocation(programPoints, "vFirstVel");
    gl.enableVertexAttribArray(vFirstVel);
    vFirstTime = gl.getAttribLocation(programPoints, "vFirstTime");
    gl.enableVertexAttribArray(vFirstTime);

    vSecondPos = gl.getAttribLocation(programPoints, "vSecondPos");
    gl.enableVertexAttribArray(vSecondPos);
    vSecondVel = gl.getAttribLocation(programPoints, "vSecondVel");
    gl.enableVertexAttribArray(vSecondVel);
    vSecondTime = gl.getAttribLocation(programPoints, "vSecondTime");
    gl.enableVertexAttribArray(vSecondTime);

    vThirdPos = gl.getAttribLocation(programPoints, "vThirdPos");
    gl.enableVertexAttribArray(vThirdPos);
    vThirdVel = gl.getAttribLocation(programPoints, "vThirdVel");
    gl.enableVertexAttribArray(vThirdVel);
    vThirdTime = gl.getAttribLocation(programPoints, "vThirdTime");
    gl.enableVertexAttribArray(vThirdTime);

    vSize = gl.getAttribLocation(programPoints, "vSize");
    gl.enableVertexAttribArray(vSize);
    vColor = gl.getAttribLocation(programPoints, "vColor");
    gl.enableVertexAttribArray(vColor);

    timeLoc = gl.getUniformLocation(programPoints, "uTime");
    let gravityLoc = gl.getUniformLocation(programPoints, "uGravity");
    gl.uniform1f(gravityLoc, GRAVITY);

    // Trails
    programTrails = initShaders(gl, "vertex-shader-trail", "fragment-shader-trail");
    gl.useProgram(programTrails);

    bufferTrails = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferTrails);
    gl.bufferData(gl.ARRAY_BUFFER, circularTrailsBuffer.maxSize * SIZEOF_FLOAT, gl.STATIC_DRAW);

    vTrailPos = gl.getAttribLocation(programTrails, "vTrailPos");
    gl.enableVertexAttribArray(vThirdPos);
    vTrailVel = gl.getAttribLocation(programTrails, "vTrailVel");
    gl.enableVertexAttribArray(vTrailVel);
    vTrailTime = gl.getAttribLocation(programTrails, "vTrailTime");
    gl.enableVertexAttribArray(vTrailTime);
    vTrailSize = gl.getAttribLocation(programTrails, "vTrailSize");
    gl.enableVertexAttribArray(vTrailSize);

    trailTimeLoc = gl.getUniformLocation(programTrails, "uTime");
    gravityLoc = gl.getUniformLocation(programTrails, "uGravity");
    gl.uniform1f(gravityLoc, GRAVITY);
    render();
};

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    time += 0.01;

    if (pressingMouseRightButton) {
        // Ghost Point
        gl.useProgram(programGhostPoint);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferGhostPoint);
        gl.vertexAttribPointer(vGhostPointPosition, 2, gl.FLOAT, false, 0, 0);
        gl.vertexAttribPointer(vGhostPointSize, 1, gl.FLOAT, false, 0, 2 * SIZEOF_FLOAT);
        gl.bufferData(gl.ARRAY_BUFFER, flatten([initPoint[0], initPoint[1], DEFAULT_POINT_SIZE]), gl.STATIC_DRAW);
        gl.drawArrays(gl.POINTS, 0, 1);

        // Line
        gl.useProgram(programLine);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferLine);
        gl.vertexAttribPointer(vLinePosition, 2, gl.FLOAT, false, 0, 0);
        gl.bufferData(gl.ARRAY_BUFFER, flatten([initPoint, finalPoint]), gl.STATIC_DRAW);
        gl.drawArrays(gl.LINES, 0, 2);
    }

    // Points
    gl.useProgram(programPoints);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferPoints);

    let stride = POINTS_ATT_PER_BLOCK * SIZEOF_FLOAT;
    gl.vertexAttribPointer(vFirstPos, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(vFirstVel, 2, gl.FLOAT, false, stride, 2 * SIZEOF_FLOAT);
    gl.vertexAttribPointer(vFirstTime, 1, gl.FLOAT, false, stride, 4 * SIZEOF_FLOAT);

    gl.vertexAttribPointer(vSecondPos, 2, gl.FLOAT, false, stride, 5 * SIZEOF_FLOAT);
    gl.vertexAttribPointer(vSecondVel, 2, gl.FLOAT, false, stride, 7 * SIZEOF_FLOAT);
    gl.vertexAttribPointer(vSecondTime, 1, gl.FLOAT, false, stride, 9 * SIZEOF_FLOAT);

    gl.vertexAttribPointer(vThirdPos, 2, gl.FLOAT, false, stride, 10 * SIZEOF_FLOAT);
    gl.vertexAttribPointer(vThirdVel, 2, gl.FLOAT, false, stride, 12 * SIZEOF_FLOAT);
    gl.vertexAttribPointer(vThirdTime, 1, gl.FLOAT, false, stride, 14 * SIZEOF_FLOAT);

    gl.vertexAttribPointer(vSize, 1, gl.FLOAT, false, stride, 15 * SIZEOF_FLOAT);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, stride, 16 * SIZEOF_FLOAT);

    gl.uniform1f(timeLoc, time);

    if (circularAttributeBuffer.size > 0)
        if (circularAttributeBuffer.head < circularAttributeBuffer.tail) {
            gl.drawArrays(gl.POINTS, circularAttributeBuffer.head,
                (circularAttributeBuffer.tail - circularAttributeBuffer.head + 1) / POINTS_ATT_PER_BLOCK);
        } else {
            gl.drawArrays(gl.POINTS, 0, circularAttributeBuffer.size / POINTS_ATT_PER_BLOCK);
        }

    // Trails
    gl.useProgram(programTrails);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferTrails);

    stride = TRAILS_ATT_PER_BLOCK * SIZEOF_FLOAT;
    gl.vertexAttribPointer(vTrailPos, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(vTrailVel, 2, gl.FLOAT, false, stride, 2 * SIZEOF_FLOAT);
    gl.vertexAttribPointer(vTrailTime, 1, gl.FLOAT, false, stride, 4 * SIZEOF_FLOAT);
    gl.vertexAttribPointer(vTrailSize, 1, gl.FLOAT, false, stride, 5 * SIZEOF_FLOAT);

    gl.uniform1f(trailTimeLoc, time);

    if (circularTrailsBuffer.size > 0)
        if (circularTrailsBuffer.head < circularTrailsBuffer.tail) {
            gl.drawArrays(gl.POINTS, circularTrailsBuffer.head,
                (circularTrailsBuffer.tail - circularTrailsBuffer.head + 1) / TRAILS_ATT_PER_BLOCK);
        } else {
            gl.drawArrays(gl.POINTS, 0, circularTrailsBuffer.size / TRAILS_ATT_PER_BLOCK);
        }

    requestAnimFrame(render);
}

function createPoint(initPoint, finalPoint) {
    gl.useProgram(programPoints);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferPoints);
    let numFrags = random(EXPLOSION_PRECISION_MIN, EXPLOSION_PRECISION_MAX);

    let xInitVel = (finalPoint[0] - initPoint[0]) * VELOCITY_FACTOR;
    let yInitVel = (finalPoint[1] - initPoint[1]) * VELOCITY_FACTOR;
    let isRocket = false;

    if (yInitVel < 0) {
        xInitVel = -xInitVel;
        yInitVel = -yInitVel;
        isRocket = true;
    }

    // Igual para todos.
    let size = DEFAULT_POINT_SIZE;
    let color = vec4(Math.random(), Math.random(), Math.random(), 1.0);

    let firstPos = initPoint;
    let firstVel = vec2(xInitVel, yInitVel);
    let firstTime = time;

    let firstFinalTime = firstTime + (-1 * firstVel[1] / GRAVITY);
    let firstElapsedTime = firstFinalTime - firstTime;

    let secondPos = position(firstPos, firstVel, firstElapsedTime);
    let secondTime = firstFinalTime;

    let secondFinalTime = secondTime + 0.35;
    let secondElapsedTime = secondFinalTime - secondTime;

    for (let i = 0; i < numFrags / GROUPS; i++) {
        // Igual em grupos de 5.
        let secondVel = velocity(firstVel, firstElapsedTime);
        let explosionVel = randomVelocity();
        secondVel = vec2(secondVel[0] + explosionVel[0], secondVel[1] + explosionVel[1]);

        let thirdPos = position(secondPos, secondVel, secondElapsedTime);
        let thirdTime = secondFinalTime;

        for (let j = 0; j < numFrags / GROUPS; j++) {
            // Diferente para todos.
            let explosionVel = randomVelocity();
            let thirdVel = velocity(secondVel, secondElapsedTime);
            thirdVel = vec2(thirdVel[0] + explosionVel[0], thirdVel[1] + explosionVel[1]);

            let data = [
                firstPos[0], firstPos[1],
                firstVel[0], firstVel[1],
                firstTime,
                secondPos[0], secondPos[1],
                secondVel[0], secondVel[1],
                secondTime,
                thirdPos[0], thirdPos[1],
                thirdVel[0], thirdVel[1],
                thirdTime,
                size,
                color[0], color[1], color[2], color[3]
            ];

            circularAttributeBuffer.addArr(data);
            gl.bufferSubData(gl.ARRAY_BUFFER, (circularAttributeBuffer.tail - POINTS_ATT_PER_BLOCK + 1) * SIZEOF_FLOAT,
                flatten(data));
        }
    }

    if (isRocket) {
        createTrail(firstPos, firstVel, firstTime, firstElapsedTime);
    }
}

function createTrail(firstPos, firstVel, firstTime, firstElapsedTime) {
    gl.useProgram(programTrails);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferTrails);

    for (let i = 0; i < firstElapsedTime; i += TRAIL_PER_TIME) {
        let trailPos = position(firstPos, firstVel, i);
        let trailVel = velocity(firstVel, i);
        trailVel = vec2(-trailVel[0], -trailVel[1]);
        let trailTime = firstTime + i;
        for (let j = 0; j < TRAIL_PRECISION; j++) {
            let data = [
                trailPos[0], trailPos[1],
                randomCentered(trailVel[0], TRAIL_X_DELTA), trailVel[1],
                trailTime,
                TRAIL_SIZE
            ];

            circularTrailsBuffer.addArr(data);
            gl.bufferSubData(gl.ARRAY_BUFFER, (circularTrailsBuffer.tail - TRAILS_ATT_PER_BLOCK + 1) * SIZEOF_FLOAT,
                flatten(data));
        }
    }

}

function auto() {
    if (autoMode) {
        let initPointAuto = vec2(random(AUTO_MODE_INIT_MIN_X, AUTO_MODE_INIT_MAX_X), AUTO_MODE_INIT_Y);

        let finalPointAuto = vec2(randomCentered(initPointAuto[0], AUTO_MODE_FINAL_X_DELTA),
            random(AUTO_MODE_FINAL_MIN_Y, AUTO_MODE_FINAL_MAX_Y));

        createPoint(initPointAuto, finalPointAuto);
        setTimeout(auto, random(AUTO_MODE_MIN_TIME_INTERVAL, AUTO_MODE_MAX_TIME_INTERVAL));
    }
}

function position(initPos, initVel, time) {
    return vec2(initPos[0] + initVel[0] * time,
        initPos[1] + initVel[1] * time + 0.5 * GRAVITY * time * time);
}

function velocity(initVel, time) {
    return vec2(initVel[0],
        initVel[1] + GRAVITY * time);
}

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function randomCentered(center, delta) {
    return random(center - delta, center + delta);
}

function randomVelocity() {
    let theta = random(0, 2 * Math.PI);
    const factor = randomNormal(0.05, 0.2);
    return vec2(Math.cos(theta) * factor, Math.sin(theta) * factor * canvas.width / canvas.height);
}

function randomNormal(min, max) {
    let x = 0;
    const lim = 3;
    for (let i = 0; i < lim; i++)
        x += random(min, max);
    return x / lim;
}
