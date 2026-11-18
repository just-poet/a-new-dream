import * as T from "three";
import { M, geo, mat, group, shape, ball, glow } from "./art.js";
import { human, horse, divineCat } from "./characters.js";
import { oldHouse, valley, ambushForest, castleWorld } from "./world.js";

const $ = (id) => document.getElementById(id);
const ui = {
  game: $("game"),
  dialog: $("dialog"),
  hud: $("hud"),
  instructions: $("instructions"),
  touch: $("touch"),
  action: $("action"),
  enemy: $("enemy-health"),
};
const keys = new Set(),
  reduced = matchMedia("(prefers-reduced-motion:reduce)").matches;
let renderer;
try {
  renderer = new T.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
} catch {
  $("line").textContent = "The 3D world could not open.";
  $("detail").textContent =
    "Please open the game in Chrome or Edge with hardware acceleration enabled.";
  $("eyelids").classList.remove("shut");
  $("sound").hidden = true;
}
if (renderer) run();

function soundEngine() {
  let context,
    master,
    on = true,
    previous = -8,
    chord = 0;
  function unlock() {
    if (!context) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      context = new C();
      master = context.createGain();
      master.gain.value = on ? 0.22 : 0;
      master.connect(context.destination);
    }
    if (context.state === "suspended") context.resume().catch(() => {});
  }
  function tone(f, t, d, v, wave = "sine") {
    if (!context || !on) return;
    const osc = context.createOscillator(),
      vol = context.createGain(),
      now = context.currentTime + t;
    osc.type = wave;
    osc.frequency.value = f;
    vol.gain.setValueAtTime(0.001, now);
    vol.gain.exponentialRampToValueAtTime(v, now + 0.025);
    vol.gain.exponentialRampToValueAtTime(0.0001, now + d);
    osc.connect(vol).connect(master);
    osc.start(now);
    osc.stop(now + d + 0.02);
  }
  return {
    unlock,
    toggle() {
      on = !on;
      unlock();
      master?.gain.setTargetAtTime(on ? 0.22 : 0, context.currentTime, 0.04);
      return on;
    },
    effect(type) {
      unlock();
      const seq = {
        hit: [220, 392, 622],
        shoot: [110, 80],
        hurt: [110, 98],
        win: [392, 523, 659, 783],
        ring: [523, 659, 783, 1046],
      }[type] ?? [293, 392];
      seq.forEach((v, i) =>
        tone(
          v,
          i * 0.065,
          type === "shoot" ? 0.085 : 0.3,
          0.13,
          type === "shoot" ? "triangle" : "sine",
        ),
      );
    },
    tick(stage) {
      if (
        !context ||
        !on ||
        stage === "opening" ||
        stage === "fight" ||
        stage === "shoot"
      )
        return;
      const now = context.currentTime;
      if (now - previous < 5.5) return;
      previous = now;
      const chords = [
        [261, 329, 392],
        [220, 293, 349],
        [196, 261, 329],
        [174, 261, 349],
      ];
      const notes = chords[chord++ % 4];
      notes.forEach((f, i) => {
        tone(f, i * 0.19, 4.1, 0.026);
        tone(f / 2, 0, 4.9, 0.018);
      });
      tone(notes[2] * 2, 2.2, 2.4, 0.021);
    },
  };
}

function run() {
  let resolution = Math.min(devicePixelRatio, 1.45),
    slowFrames = 0;
  renderer.setPixelRatio(resolution);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.09;
  renderer.outputColorSpace = T.SRGBColorSpace;
  $("viewport").append(renderer.domElement);
  const camera = new T.PerspectiveCamera(
      51,
      innerWidth / innerHeight,
      0.08,
      480,
    ),
    look = new T.Vector3(),
    eye = new T.Vector3(),
    gaze = new T.Vector3();
  const audio = soundEngine(),
    cache = new Map(),
    raycaster = new T.Raycaster();
  const player = { x: 0, z: 1.72, health: 5 };
  let world,
    place,
    hero,
    npc,
    mount,
    cat,
    stage = "opening",
    snap = true,
    time = 0,
    previous,
    locked = false;
  let pausedStage,
    attackAt = -10,
    lastSwing = -10,
    nextStrike = 0,
    telegraph = false,
    gothelHP = 7,
    toastUntil = 0;
  let ringRevealed = false;
  let dodgeUntil = -10,
    dodgeReady = -10;
  let downAt = -10,
    journey = 0,
    steer = 0,
    rideSpeed = 0,
    killed = 0,
    bandits = [],
    shootAt = -10;
  const tip = {
    fight:
      "<kbd>WASD</kbd> Move · <kbd>Space</kbd> Swing pan · <kbd>Shift</kbd> Dodge · <kbd>Esc</kbd> Pause",
    shoot:
      "Click the marked bandits to aim and shoot · <kbd>Space</kbd> Shoot nearest target · <kbd>Esc</kbd> Pause",
    ride: "Hold <kbd>W / ↑</kbd> to ride · <kbd>A D / ← →</kbd> Steer · <kbd>S / ↓</kbd> Slow down · <kbd>Esc</kbd> Pause",
  };
  const active = () => ["fight", "shoot", "ride"].includes(stage);

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < 0.78 ? 65 : 51;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    snap = true;
  }
  addEventListener("resize", resize);
  resize();

  function setWorld(name) {
    if (!cache.has(name)) {
      const next = {
        room: oldHouse,
        outside: valley,
        forest: ambushForest,
        castle: castleWorld,
      }[name]();
      next.hero = human(next.scene);
      if (name === "room") {
        next.npc = human(next.scene, "gothel");
        next.cat = divineCat(next.scene);
        next.cat.root.visible = false;
      } else {
        next.mount = horse(next.scene);
        next.npc = human(next.scene, "eugene");
      }
      cache.set(name, next);
    }
    world = cache.get(name);
    place = name;
    ({ hero, npc, mount, cat } = world);
    snap = true;
    ui.game.dataset.scene = name;
    if (name === "room") {
      hero.root.position.set(player.x, 0, player.z);
      hero.root.rotation.set(0, Math.PI, 0);
      npc.root.position.set(0, 0, -1.35);
      npc.root.rotation.set(0, 0, 0);
    }
  }

  function setStage(value) {
    stage = value;
    ui.game.dataset.mode = value;
    const playing = active();
    ui.dialog.hidden = true;
    ui.hud.hidden = !playing;
    $("pause").hidden = !playing;
    ui.touch.hidden = !playing;
    ui.instructions.hidden = !playing;
    ui.instructions.innerHTML = tip[value] ?? "";
    ui.enemy.hidden = value !== "fight";
    $("reticle").hidden = value !== "shoot";
    $("health").hidden = value !== "fight";
    ui.action.hidden = value === "shoot";
    ui.action.textContent = value === "ride" ? "Ride forward" : "Swing pan";
    $("dodge").hidden = value !== "fight";
    if (matchMedia("(pointer:coarse)").matches || camera.aspect < 0.78) {
      ui.instructions.textContent =
        {
          fight:
            "Move with the arrows. Swing nearby. Dodge when Gothel strikes.",
          shoot: "Tap the marked bandits to aim and shoot.",
          ride: "Hold Ride forward and use the arrows to steer.",
        }[value] ?? "";
    }
    $("target-layer").hidden = value !== "shoot";
    keys.clear();
  }

  function dialogue(speaker, line, options, detail = "") {
    $("speaker").textContent = speaker;
    $("speaker").hidden = !speaker;
    $("line").textContent = line;
    $("detail").textContent = detail;
    $("detail").hidden = !detail;
    $("choices").replaceChildren(
      ...options.map(([text, action]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = text;
        button.addEventListener("click", () => {
          if (locked) return;
          audio.unlock();
          action();
        });
        return button;
      }),
    );
    ui.dialog.hidden = false;
  }

  function toast(message, seconds = 1.8) {
    $("toast").textContent = message;
    $("toast").hidden = false;
    toastUntil = time + seconds;
  }

  function cut(action) {
    if (locked) return;
    if (reduced) {
      action();
      return;
    }
    locked = true;
    $("fade").classList.add("active");
    setTimeout(() => {
      action();
      $("fade").classList.remove("active");
      locked = false;
    }, 310);
  }

  function awaken() {
    setStage("wake");
    $("eyelids").classList.remove("shut");
    hero.weapon("none");
    npc.root.visible = true;
    cat.root.visible = false;
    dialogue(
      "Rapunzel",
      "WHY YOU HAVE KEPT ME HERE",
      [["Continue", gothelReply]],
      "You open your eyes in a locked, unfamiliar house.",
    );
  }
  function gothelReply() {
    setStage("gothel");
    dialogue("Mother Gothel", "BECAUSE I DONT WANNA DIE, I CANT LET YOU GOOO", [
      ["Continue", catAppears],
    ]);
  }
  function catAppears() {
    setStage("cat");
    cat.root.visible = true;
    cat.root.position.set(1.62, 1.4, -0.36);
    audio.effect("ring");
    dialogue(
      "A very divine cat",
      "SKTCHHHH HER, YOU ARE THE MAIN CHARACTER !! PRINCESSS",
      [["Pick up the pan", startFight]],
    );
  }

  function startFight() {
    gothelHP = 7;
    player.health = 5;
    player.x = 0;
    player.z = 1.72;
    lastSwing = -10;
    downAt = -10;
    npc.root.position.set(0, 0, -1.35);
    npc.root.rotation.set(0, 0, 0);
    hero.root.position.set(0, 0, 1.72);
    hero.weapon("pan");
    cat.root.visible = false;
    setStage("fight");
    nextStrike = time + 2.15;
    telegraph = false;
    $("objective").textContent = "Defeat Mother Gothel";
    $("score").textContent = "Pan ready";
    $("progress").max = 7;
    $("progress").value = 7;
    $("gothel-health").value = 7;
    updateHealth();
    toast("Move close, swing the pan, and step away when she attacks.", 3.8);
  }
  function updateHealth() {
    $("health").textContent =
      "♥".repeat(player.health) + "♡".repeat(5 - player.health);
  }
  function swing() {
    if (stage !== "fight" || locked || time - lastSwing < 0.53) return;
    lastSwing = time;
    attackAt = time;
    const distance = Math.hypot(
      player.x - npc.root.position.x,
      player.z - npc.root.position.z,
    );
    hero.root.rotation.y = Math.atan2(
      npc.root.position.x - player.x,
      npc.root.position.z - player.z,
    );
    if (distance > 1.82) {
      toast("Get a little closer to Gothel.", 1.1);
      return;
    }
    gothelHP--;
    audio.effect("hit");
    $("progress").value = gothelHP;
    $("gothel-health").value = gothelHP;
    flash(0xffd58a, 0.18);
    if (gothelHP === 0) {
      downAt = time;
      setStage("victory");
      audio.effect("win");
      dialogue("Rapunzel", "HELL YEAH, BYE MOMMY", [
        ["Step outside", () => cut(meetEugene)],
      ]);
    } else toast(["CLANG!", "BONK!", "Nice swing!"][gothelHP % 3], 0.7);
  }
  function lose() {
    setStage("retry");
    dialogue(
      "A little setback",
      "Take a breath, princess.",
      [["Try again", startFight]],
      "Step away when Gothel raises her arms, then move in and swing.",
    );
  }
  function fight(dt) {
    const axisX =
      Number(held("KeyD", "ArrowRight")) - Number(held("KeyA", "ArrowLeft"));
    const axisZ =
      Number(held("KeyS", "ArrowDown")) - Number(held("KeyW", "ArrowUp"));
    const dodge = held("ShiftLeft", "ShiftRight") || time < dodgeUntil;
    const speed =
      ((dodge ? 4.7 : 2.75) * dt) / (axisX && axisZ ? Math.SQRT2 : 1);
    player.x = M.clamp(player.x + axisX * speed, -2.38, 2.38);
    player.z = M.clamp(player.z + axisZ * speed, -2.65, 2.56);
    hero.root.position.set(player.x, 0, player.z);
    if (axisX || axisZ)
      hero.root.rotation.y = M.damp(
        hero.root.rotation.y,
        Math.atan2(axisX, axisZ),
        10,
        dt,
      );
    const target = npc.root.position;
    const distance = Math.hypot(player.x - target.x, player.z - target.z);
    npc.root.rotation.y = Math.atan2(player.x - target.x, player.z - target.z);
    if (time < nextStrike - 0.86 && distance > 1.25) {
      const speed = 0.69 * dt;
      target.x += ((player.x - target.x) / distance) * speed;
      target.z += ((player.z - target.z) / distance) * speed;
    }
    telegraph = time > nextStrike - 0.86;
    if (telegraph && time < nextStrike - 0.72)
      toast("Gothel is about to strike — move away!", 0.9);
    if (time >= nextStrike) {
      if (distance < 1.52 && !dodge) {
        player.health--;
        audio.effect("hurt");
        flash(0xb53860, 0.25);
        updateHealth();
        if (player.health <= 0) {
          lose();
          return;
        }
      }
      nextStrike = time + 2.7;
    }
    if (held("Space")) swing();
  }

  function meetEugene() {
    setWorld("outside");
    setStage("meeting");
    hero.root.position.set(0.12, 0, 1.25);
    hero.root.rotation.set(0, Math.PI * 0.27, 0);
    hero.weapon("none");
    npc.root.position.set(1.68, 0, -0.18);
    npc.root.rotation.set(0, -0.75, 0);
    mount.root.position.set(4.08, 0, -1.2);
    mount.root.rotation.y = -0.35;
    dialogue(
      "Eugene",
      "WASSUP MY DARLING ! HAD A GOOD FUNN WITH UR MOTHER HEHE ! WELL NOW WE NEEDA GO SOMWHERE",
      [["Continue", giveGun]],
    );
  }
  function giveGun() {
    setStage("gun");
    hero.weapon("gun");
    dialogue(
      "Eugene",
      "HELL YEAH !! AMERICAN DREAM ! BTW THATS FOR SHOOTING EVIL PEOPLE NOW COME ON HOP ON BEHIND ME",
      [["Sit on the horse", () => cut(startForest)]],
    );
  }
  function seatRiders(front) {
    mount.riders.add(hero.root, npc.root);
    hero.root.position.set(0, 1.06, front ? -0.24 : 0.44);
    hero.root.rotation.set(0, Math.PI, 0);
    hero.root.scale.setScalar(0.82);
    npc.root.position.set(0, 1.07, front ? 0.5 : -0.27);
    npc.root.rotation.set(0, Math.PI, 0);
    npc.root.scale.setScalar(0.84);
  }

  function startForest() {
    setWorld("forest");
    setStage("shoot");
    journey = 0;
    killed = 0;
    steer = 0;
    seatRiders(false);
    hero.weapon("gun");
    mount.root.position.set(0, 0, 0);
    for (const old of bandits) {
      old.person.root.removeFromParent();
      old.button.remove();
    }
    bandits = [22, 47, 74, 103, 132].map((distance, index) => {
      const person = human(world.scene, "bandit"),
        x = [-2.0, 2.1, -2.25, 2.45, 0][index];
      person.root.position.set(x, 0, -distance - 6);
      const button = document.createElement("button");
      button.className = "target";
      button.type = "button";
      button.setAttribute("aria-label", "Shoot bandit " + (index + 1));
      const dot = document.createElement("span");
      dot.textContent = "● ●";
      button.append(document.createTextNode("＋"), dot);
      button.hidden = true;
      const enemy = { person, distance, x, hp: 2, button, diedAt: Infinity };
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        shoot(enemy);
      });
      $("target-layer").append(button);
      return enemy;
    });
    $("objective").textContent = "Clear the forest trail";
    $("score").textContent = "0 / 5";
    $("progress").max = 5;
    $("progress").value = 0;
    toast("Aim at each marked bandit. Two shots defeat each one.", 3.5);
  }

  function shoot(enemy) {
    if (stage !== "shoot" || locked || time - shootAt < 0.2) return;
    if (!enemy)
      enemy = bandits.find((e) => e.hp > 0 && e.distance - journey < 38);
    if (!enemy || enemy.hp === 0 || enemy.distance - journey > 38) return;
    shootAt = time;
    enemy.hp--;
    enemy.button.querySelector("span").textContent = enemy.hp ? "●" : "";
    audio.effect("shoot");
    flash(0xffe5a5, 0.13);
    if (enemy.hp === 0) {
      enemy.diedAt = time;
      enemy.button.hidden = true;
      killed++;
      $("score").textContent = killed + " / 5";
      $("progress").value = killed;
      toast(
        killed === 5 ? "All five bandits defeated!" : "Bandit defeated",
        1.0,
      );
    }
  }

  function forestRide(dt) {
    const nearest = bandits.find((e) => e.hp > 0);
    const blocked = nearest && journey >= nearest.distance - 15.5;
    rideSpeed = blocked ? 0 : 5.1;
    journey = Math.min(154, journey + rideSpeed * dt);
    mount.root.position.set(Math.sin(journey * 0.055) * 0.22, 0, -journey);
    for (const [i, e] of bandits.entries()) {
      const offset = e.distance - journey;
      if (e.hp > 0) {
        e.person.root.rotation.y = Math.atan2(
          mount.root.position.x - e.person.root.position.x,
          mount.root.position.z - e.person.root.position.z,
        );
        e.button.hidden = offset > 38 || offset < -7;
      }
      e.person.pose(time, {
        angry: true,
        down: e.hp === 0 ? M.clamp((time - e.diedAt) * 1.6, 0, 1) : 0,
      });
      if (e.hp === 0) e.person.root.position.y = -0.02;
    }
    if (held("Space")) shoot();
    if (killed === 5 && journey >= 147) {
      setStage("praise");
      dialogue("Eugene", "MY GIRLFRIEND IS THE BEST SHOOTER EVER", [
        ["Continue to the castle bridge", () => cut(startCastle)],
      ]);
    }
  }
  function startCastle() {
    setWorld("castle");
    setStage("bridge");
    journey = 0;
    steer = 0;
    rideSpeed = 0;
    seatRiders(true);
    hero.weapon("none");
    updateMount(0);
    dialogue("Eugene", "SLOWWW OR IMMA FALLL, POOOKIE", [
      [
        "Take the reins",
        () => {
          setStage("ride");
          $("objective").textContent = "Ride to the castle terrace";
          $("score").textContent = "0%";
          $("progress").max = 100;
          $("progress").value = 0;
          toast("You have the reins. Hold forward and steer up the ramp.", 3.2);
        },
      ],
    ]);
  }
  function updateMount(dt) {
    const u = journey / world.length;
    const p = world.curve.getPointAt(M.clamp(u, 0, 1)),
      t = world.curve.getTangentAt(M.clamp(u, 0, 1));
    const side = new T.Vector3(-t.z, 0, t.x).normalize();
    mount.root.position.copy(p).addScaledVector(side, steer);
    const heading = Math.atan2(-t.x, -t.z);
    const diff = Math.atan2(
      Math.sin(heading - mount.root.rotation.y),
      Math.cos(heading - mount.root.rotation.y),
    );
    mount.root.rotation.y += diff * (dt ? 1 - Math.exp(-7 * dt) : 1);
  }
  function castleRide(dt) {
    const forward = held("KeyW", "ArrowUp"),
      brake = held("KeyS", "ArrowDown");
    rideSpeed = M.damp(
      rideSpeed,
      forward ? (brake ? 1.05 : 3.35) : 0,
      brake ? 9 : 3.5,
      dt,
    );
    const direction =
      Number(held("KeyD", "ArrowRight")) - Number(held("KeyA", "ArrowLeft"));
    steer = M.clamp(steer + direction * dt * 1.85, -1.4, 1.4);
    journey = Math.min(world.length, journey + rideSpeed * dt);
    updateMount(dt);
    const percent = Math.floor((journey / world.length) * 100);
    $("score").textContent = percent + "%";
    $("progress").value = percent;
    if (journey >= world.length - 0.15) terrace();
  }

  function terrace() {
    setStage("terrace");
    world.scene.attach(hero.root);
    world.scene.attach(npc.root);
    hero.root.scale.setScalar(1);
    npc.root.scale.setScalar(1);
    hero.root.position.set(0.55, 23.23, -24.2);
    hero.root.rotation.set(0, 2.33, 0);
    npc.root.position.set(2.02, 23.23, -25.6);
    npc.root.rotation.set(0, -0.81, 0);
    mount.root.position.set(-2.72, 23.23, -23.76);
    mount.root.rotation.y = 0.7;
    rideSpeed = 0;
    snap = true;
    dialogue("Eugene", "CAN YOU CLOSE YOUR EYES ? PLEASEE", [
      ["Close your eyes", closeEyes],
    ]);
  }
  function closeEyes() {
    setStage("eyes");
    $("eyelids").classList.add("shut");
    setTimeout(
      () => {
        if (stage !== "eyes") return;
        dialogue("Eugene", "Ready, princess?", [["Continue", proposal]]);
      },
      reduced ? 20 : 1900,
    );
  }
  function proposal() {
    ringRevealed = false;
    setStage("proposal");
    $("eyelids").classList.remove("shut");
    audio.effect("ring");
    dialogue(
      "Eugene",
      "I LOVE YOUUUUU RAPUNZEL , EVERY MOMENT WITH YOU FEELS SPECIAL AND MAGICAL . I LOVE YAPPING WITH YOU AND LISTENING TO YOU , I WANNA LISTEN TO YOU MY WHOLE LIFE AND YOU ARE THE CUTEST, SWEETEST , INSPIRING AND THE MOST ADORABLE EVER . YOU ARE MYYY NEWW DREAM",
      [["Continue", question]],
    );
  }
  function question() {
    ringRevealed = true;
    setStage("proposal");
    audio.effect("ring");
    dialogue("Eugene", "WILL YOU MARRY ME ?", [
      ["YES", () => answer(true)],
      ["NO", () => answer(false)],
    ]);
  }
  function answer(yes) {
    setStage("answer");
    audio.effect(yes ? "win" : "ring");
    dialogue(
      "Eugene",
      yes
        ? "YAYYYY, YIPPIEEEEEE . I LOVE YOUUUUUUUUUUU . BEST DAY OF MYYYYY LIFE"
        : "ITS OKAY, I UNDERSTAND",
      [["Continue", closeCurtain]],
    );
  }
  function closeCurtain() {
    setStage("ending");
    $("curtain").setAttribute("aria-hidden", "false");
    $("curtain").classList.add("closed");
    setTimeout(
      () => {
        $("curtain-message").hidden = false;
      },
      reduced ? 20 : 2200,
    );
  }
  function opening() {
    ringRevealed = false;
    $("curtain").setAttribute("aria-hidden", "true");
    $("curtain").classList.remove("closed");
    $("curtain-message").hidden = true;
    $("eyelids").classList.add("shut");
    $("target-layer").replaceChildren();
    bandits = [];
    player.x = 0;
    player.z = 1.72;
    player.health = 5;
    downAt = -10;
    gothelHP = 7;
    telegraph = false;
    setWorld("room");
    npc.root.visible = true;
    cat.root.visible = false;
    hero.root.scale.setScalar(1);
    hero.weapon("none");
    setStage("opening");
    dialogue(
      "",
      "A new dream",
      [["Open your eyes", awaken]],
      "Wake up, princess.",
    );
  }

  function pause() {
    if (stage === "paused") {
      setStage(pausedStage);
      return;
    }
    if (!active() || locked) return;
    pausedStage = stage;
    setStage("paused");
    dialogue("", "A moment to breathe.", [
      ["Continue playing", () => setStage(pausedStage)],
      ["Start again", () => cut(opening)],
    ]);
  }

  function held(...codes) {
    return codes.some((code) => keys.has(code));
  }
  function down(code) {
    keys.add(code);
    if (code === "Space") {
      if (stage === "fight") swing();
      if (stage === "shoot") shoot();
    }
  }
  addEventListener("keydown", (event) => {
    if (event.code === "Escape") {
      event.preventDefault();
      if (!event.repeat) pause();
      return;
    }
    if (
      [
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "ArrowUp",
        "ArrowLeft",
        "ArrowDown",
        "ArrowRight",
        "Space",
        "ShiftLeft",
        "ShiftRight",
      ].includes(event.code) &&
      active()
    ) {
      event.preventDefault();
      audio.unlock();
      down(event.code);
    }
  });
  addEventListener("keyup", (event) => keys.delete(event.code));
  addEventListener("blur", () => keys.clear());
  for (const button of ui.touch.querySelectorAll("[data-key]")) {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      down(button.dataset.key);
    });
    for (const e of ["pointerup", "pointercancel", "lostpointercapture"])
      button.addEventListener(e, () => keys.delete(button.dataset.key));
  }
  ui.action.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    ui.action.setPointerCapture(event.pointerId);
    audio.unlock();
    if (stage === "ride") down("KeyW");
    else swing();
  });
  for (const e of ["pointerup", "pointercancel", "lostpointercapture"])
    ui.action.addEventListener(e, () => keys.delete("KeyW"));
  $("dodge").addEventListener("click", () => {
    if (stage !== "fight" || time < dodgeReady) return;
    dodgeUntil = time + 0.65;
    dodgeReady = time + 1.25;
    toast("Dodge!", 0.55);
  });
  $("pause").addEventListener("click", pause);
  $("sound").addEventListener("click", () => {
    const enabled = audio.toggle();
    $("sound").textContent = enabled ? "♫" : "♪̸";
    $("sound").setAttribute(
      "aria-label",
      enabled ? "Mute sound" : "Enable sound",
    );
    $("sound").setAttribute("aria-pressed", String(enabled));
  });
  $("replay").addEventListener("click", () => cut(opening));
  renderer.domElement.addEventListener("pointerdown", (event) => {
    audio.unlock();
    if (stage === "fight") swing();
    if (stage === "shoot") {
      const p = new T.Vector2(
        (event.clientX / innerWidth) * 2 - 1,
        1 - (event.clientY / innerHeight) * 2,
      );
      raycaster.setFromCamera(p, camera);
      const enemy = bandits.find(
        (e) =>
          e.hp > 0 &&
          e.distance - journey < 38 &&
          raycaster.intersectObject(e.person.root, true).length,
      );
      if (enemy) shoot(enemy);
    }
  });
  function flash(color, opacity) {
    const f = $("flash");
    f.style.background = new T.Color(color).getStyle();
    f.style.opacity = opacity;
    setTimeout(() => {
      f.style.opacity = 0;
    }, 70);
  }

  function aim(dt) {
    const portrait = camera.aspect < 0.78;
    if (place === "room") {
      if (["wake", "gothel"].includes(stage)) {
        eye.set(portrait ? 1.65 : 1.91, 2.08, portrait ? 6.2 : 4.9);
        gaze.set(0.13, 1.42, -0.91);
      } else if (stage === "cat") {
        eye.set(portrait ? 0.68 : 1.13, 2.2, portrait ? 7.5 : 5.0);
        gaze.set(portrait ? 0.5 : 0.4, 1.77, -0.3);
      } else {
        eye.set(
          player.x * 0.25 + (portrait ? 2.3 : 1.5),
          portrait ? 3.8 : 3.45,
          portrait ? 8.0 : 6.6,
        );
        gaze.set(player.x * 0.21 + 0.22, 1.14, -0.17);
      }
    } else if (place === "outside") {
      eye.set(
        portrait ? 1.9 : 2.53,
        portrait ? 2.48 : 2.68,
        portrait ? 9.3 : 6.8,
      );
      gaze.set(1.0, 1.47, -3.65);
    } else if (place === "forest") {
      const p = mount.root.position;
      eye.set(p.x + 2.1, portrait ? 3.95 : 3.56, p.z + (portrait ? 9.7 : 7.1));
      gaze.set(p.x - 0.3, 1.73, p.z - 10.3);
    } else if (["bridge", "ride", "paused"].includes(stage)) {
      const u = M.clamp(journey / world.length, 0, 1);
      const p = mount.root.position,
        t = world.curve.getTangentAt(u);
      eye.copy(p).addScaledVector(t, portrait ? -9.4 : -7.5);
      eye.y += portrait ? 4.4 : 3.8;
      gaze.copy(p).addScaledVector(t, 5.5);
      gaze.y += 1.5;
    } else {
      const proposal = ["proposal", "answer", "ending"].includes(stage);
      if (proposal && !portrait) {
        eye.set(0.35, 25.35, -17.45);
        gaze.set(-0.3, 24.37, -25.07);
      } else {
        eye.set(
          portrait ? 1.4 : 5.3,
          portrait ? 26.0 : 26.05,
          portrait ? -13.8 : -16.4,
        );
        gaze.set(1.03, 24.36, -24.85);
      }
    }
    if (snap) {
      camera.position.copy(eye);
      look.copy(gaze);
      snap = false;
    } else {
      camera.position.lerp(eye, 1 - Math.exp(-5.4 * dt));
      look.lerp(gaze, 1 - Math.exp(-6.1 * dt));
    }
    camera.lookAt(look);
    world.sky.position.copy(camera.position);
    if (stage === "shoot") {
      for (const e of bandits) {
        if (e.button.hidden) continue;
        const screen = new T.Vector3(
          e.person.root.position.x,
          1.22,
          e.person.root.position.z,
        ).project(camera);
        e.button.style.left = (screen.x * 0.5 + 0.5) * innerWidth + "px";
        e.button.style.top = (0.5 - screen.y * 0.5) * innerHeight + "px";
        const size = M.clamp(510 / Math.max(1, e.distance - journey), 45, 71);
        e.button.style.width = size + "px";
        e.button.style.height = size + "px";
        e.button.hidden = screen.z > 1 || Math.abs(screen.x) > 1.15;
      }
    }
  }

  function frame(now) {
    const elapsed = previous === undefined ? 1 / 60 : (now - previous) / 1000,
      dt = M.clamp(elapsed, 0, 0.075);
    previous = now;
    slowFrames = elapsed > 0.061 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames > 18 && resolution > 0.75) {
      resolution = Math.max(0.75, resolution * 0.84);
      renderer.setPixelRatio(resolution);
      slowFrames = 0;
    }
    if (stage !== "paused") time += dt;
    if (!locked) {
      if (stage === "fight") fight(dt);
      if (stage === "shoot") forestRide(dt);
      if (stage === "ride") castleRide(dt);
    }
    const walking =
      stage === "fight" &&
      held(
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      )
        ? 1
        : 0;
    const seated =
      place === "forest" ||
      (place === "castle" && ["bridge", "ride", "paused"].includes(stage));
    const kneel = ["proposal", "answer", "ending"].includes(stage);
    hero.pose(time, {
      walk: walking,
      attack: stage === "fight" ? Math.max(0, 1 - (time - attackAt) / 0.46) : 0,
      seated,
    });
    npc.pose(time, {
      angry: place === "room" && (stage === "gothel" || telegraph),
      attack: place === "room" && telegraph ? 0.65 : 0,
      seated,
      kneel,
      ringVisible: ringRevealed,
      down:
        place === "room" && gothelHP === 0
          ? M.clamp((time - downAt) * 1.7, 0, 1)
          : 0,
    });
    if (cat?.root.visible) cat.pose(time);
    if (mount) mount.pose(time, active() ? rideSpeed / 5 : 0);
    if (time > toastUntil) $("toast").hidden = true;
    for (const update of world.updates) update(time);
    audio.tick(stage);
    aim(dt);
    renderer.render(world.scene, camera);
    requestAnimationFrame(frame);
  }
  opening();
  requestAnimationFrame(frame);
}
