// game/models.js - Procedural 3D voxel models for chickens, weapons, crates, barrels and props

import * as THREE from 'three';

// Cached shared materials for performance
const materials = {
  yellow: new THREE.MeshLambertMaterial({ color: 0xffd166 }),
  orange: new THREE.MeshLambertMaterial({ color: 0xf77f00 }),
  red: new THREE.MeshLambertMaterial({ color: 0xd62828 }),
  white: new THREE.MeshLambertMaterial({ color: 0xffffff }),
  black: new THREE.MeshLambertMaterial({ color: 0x14213d }),
  metal: new THREE.MeshLambertMaterial({ color: 0xadb5bd }),
  gold: new THREE.MeshLambertMaterial({ color: 0xffb703 }),
  wood: new THREE.MeshLambertMaterial({ color: 0x8d5b4c }),
  green: new THREE.MeshLambertMaterial({ color: 0x2a9d8f }),
  darkGray: new THREE.MeshLambertMaterial({ color: 0x333533 }),
};

function getTeamMaterial(hex) {
  return new THREE.MeshLambertMaterial({ color: hex || 0xe63946 });
}

// Procedural rubber/toy chicken
export function createChickenModel(teamColorHex = 0xe63946, accessoryId = 'casco', isRobot = false) {
  const root = new THREE.Group();

  const bodyMat = isRobot ? materials.metal : materials.yellow;
  const beakMat = isRobot ? materials.darkGray : materials.orange;
  const crestMat = isRobot ? materials.metal : materials.red;
  const teamMat = getTeamMaterial(teamColorHex);

  // Body container (for wobble animation)
  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.5;
  root.add(bodyGroup);

  // Main body box (voxel style)
  const bodyGeo = new THREE.BoxGeometry(0.7, 0.75, 0.7);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = true;
  bodyMesh.position.y = 0.35;
  bodyGroup.add(bodyMesh);

  // Belly highlight
  const bellyGeo = new THREE.BoxGeometry(0.5, 0.5, 0.08);
  const bellyMat = isRobot ? materials.darkGray : new THREE.MeshLambertMaterial({ color: 0xffe3a8 });
  const bellyMesh = new THREE.Mesh(bellyGeo, bellyMat);
  bellyMesh.position.set(0, 0.3, 0.35);
  bodyGroup.add(bellyMesh);

  // Head comb/crest
  const crestGeo = new THREE.BoxGeometry(0.16, 0.25, 0.4);
  const crestMesh = new THREE.Mesh(crestGeo, crestMat);
  crestMesh.position.set(0, 0.8, 0);
  bodyGroup.add(crestMesh);

  // Beak
  const beakGeo = new THREE.BoxGeometry(0.24, 0.16, 0.28);
  const beakMesh = new THREE.Mesh(beakGeo, beakMat);
  beakMesh.position.set(0, 0.45, 0.45);
  bodyGroup.add(beakMesh);

  // Big cartoon eyes
  const eyeWhiteGeo = new THREE.BoxGeometry(0.16, 0.18, 0.1);
  const pupilGeo = new THREE.BoxGeometry(0.08, 0.1, 0.06);

  const leftEye = new THREE.Mesh(eyeWhiteGeo, materials.white);
  leftEye.position.set(0.2, 0.55, 0.36);
  const leftPupil = new THREE.Mesh(pupilGeo, materials.black);
  leftPupil.position.set(0.2, 0.55, 0.41);
  bodyGroup.add(leftEye, leftPupil);

  const rightEye = new THREE.Mesh(eyeWhiteGeo, materials.white);
  rightEye.position.set(-0.2, 0.55, 0.36);
  const rightPupil = new THREE.Mesh(pupilGeo, materials.black);
  rightPupil.position.set(-0.2, 0.55, 0.41);
  bodyGroup.add(rightEye, rightPupil);

  // Flapping wings
  const wingGeo = new THREE.BoxGeometry(0.12, 0.35, 0.45);
  const leftWing = new THREE.Mesh(wingGeo, bodyMat);
  leftWing.position.set(0.4, 0.4, 0);
  bodyGroup.add(leftWing);

  const rightWing = new THREE.Mesh(wingGeo, bodyMat);
  rightWing.position.set(-0.4, 0.4, 0);
  bodyGroup.add(rightWing);

  // Little feet
  const footGeo = new THREE.BoxGeometry(0.2, 0.1, 0.3);
  const leftFoot = new THREE.Mesh(footGeo, beakMat);
  leftFoot.position.set(0.2, 0.05, 0.05);
  root.add(leftFoot);

  const rightFoot = new THREE.Mesh(footGeo, beakMat);
  rightFoot.position.set(-0.2, 0.05, 0.05);
  root.add(rightFoot);

  // Accessory on head
  const accGroup = new THREE.Group();
  accGroup.position.set(0, 0.75, 0);
  bodyGroup.add(accGroup);

  if (accessoryId === 'casco') {
    const helmetGeo = new THREE.BoxGeometry(0.76, 0.28, 0.76);
    const helmet = new THREE.Mesh(helmetGeo, teamMat);
    const brimGeo = new THREE.BoxGeometry(0.84, 0.08, 0.84);
    const brim = new THREE.Mesh(brimGeo, teamMat);
    brim.position.y = -0.1;
    accGroup.add(helmet, brim);
  } else if (accessoryId === 'sombrero_vueltiao') {
    const brimGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.06, 12);
    const crownGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.32, 10);
    const hatMat = new THREE.MeshLambertMaterial({ color: 0xf5ebe0 });
    const bandMat = materials.black;
    const brim = new THREE.Mesh(brimGeo, hatMat);
    const crown = new THREE.Mesh(crownGeo, hatMat);
    crown.position.y = 0.16;
    const bandGeo = new THREE.CylinderGeometry(0.42, 0.43, 0.08, 10);
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.y = 0.08;
    accGroup.add(brim, crown, band);
  } else if (accessoryId === 'gorra') {
    const capGeo = new THREE.BoxGeometry(0.65, 0.22, 0.65);
    const cap = new THREE.Mesh(capGeo, teamMat);
    const visorGeo = new THREE.BoxGeometry(0.55, 0.06, 0.35);
    const visor = new THREE.Mesh(visorGeo, teamMat);
    visor.position.set(0, -0.06, 0.45);
    accGroup.add(cap, visor);
  } else if (accessoryId === 'corona') {
    const crownGeo = new THREE.CylinderGeometry(0.4, 0.35, 0.26, 6);
    const crown = new THREE.Mesh(crownGeo, materials.gold);
    accGroup.add(crown);
  } else if (accessoryId === 'bandana') {
    const bandGeo = new THREE.BoxGeometry(0.76, 0.16, 0.76);
    const band = new THREE.Mesh(bandGeo, teamMat);
    accGroup.add(band);
  } else if (accessoryId === 'monoculo') {
    const monoGeo = new THREE.TorusGeometry(0.12, 0.03, 8, 16);
    const mono = new THREE.Mesh(monoGeo, materials.gold);
    mono.position.set(0.2, -0.2, 0.42);
    accGroup.add(mono);
  } else if (accessoryId === 'disfraz_zorro') {
    const foxEarGeo = new THREE.ConeGeometry(0.14, 0.28, 4);
    const foxMat = new THREE.MeshLambertMaterial({ color: 0xd94e34 });
    const earL = new THREE.Mesh(foxEarGeo, foxMat);
    earL.position.set(0.25, 0.16, 0);
    const earR = new THREE.Mesh(foxEarGeo, foxMat);
    earR.position.set(-0.25, 0.16, 0);
    accGroup.add(earL, earR);
  }

  // Shadow blob under the chicken (fast, perfect for mobile)
  const shadowGeo = new THREE.CircleGeometry(0.45, 12);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  // Weapon attachment point
  const weaponHolder = new THREE.Group();
  weaponHolder.position.set(0.4, 0.4, 0.2);
  bodyGroup.add(weaponHolder);

  // Retain parts for animation
  root.userData = {
    bodyGroup,
    leftWing,
    rightWing,
    leftFoot,
    rightFoot,
    weaponHolder,
    shadow,
    pose: 'idle',
    time: 0,
    animate: function (dt, pose = 'idle', isMoving = false) {
      this.time += dt;
      const t = this.time;

      if (pose === 'hurt') {
        bodyGroup.rotation.x = -0.4;
        bodyGroup.rotation.z = Math.sin(t * 20) * 0.2;
        leftWing.rotation.z = 0.8;
        rightWing.rotation.z = -0.8;
      } else if (pose === 'jump' || pose === 'fall') {
        bodyGroup.position.y = 0.6;
        leftWing.rotation.z = Math.sin(t * 15) * 0.6 + 0.4;
        rightWing.rotation.z = -Math.sin(t * 15) * 0.6 - 0.4;
        leftFoot.position.y = 0.15;
        rightFoot.position.y = 0.15;
      } else if (isMoving) {
        // Walk waddle
        const waddle = Math.sin(t * 10);
        bodyGroup.rotation.z = waddle * 0.18;
        bodyGroup.position.y = 0.5 + Math.abs(Math.cos(t * 10)) * 0.12;
        leftFoot.position.z = Math.sin(t * 10) * 0.15;
        rightFoot.position.z = -Math.sin(t * 10) * 0.15;
        leftWing.rotation.z = Math.max(0, waddle * 0.4);
        rightWing.rotation.z = Math.min(0, waddle * 0.4);
      } else {
        // Idle breathing
        bodyGroup.rotation.z = 0;
        bodyGroup.rotation.x = 0;
        bodyGroup.position.y = 0.5 + Math.sin(t * 3) * 0.03;
        leftFoot.position.set(0.2, 0.05, 0.05);
        rightFoot.position.set(-0.2, 0.05, 0.05);
        leftWing.rotation.z = 0;
        rightWing.rotation.z = 0;
      }
    },
  };

  return root;
}

// Procedural 3D Weapon Models
export function createWeaponModel(weaponId) {
  const root = new THREE.Group();

  if (weaponId === 'bazuca') {
    const tubeGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.8, 8);
    const tube = new THREE.Mesh(tubeGeo, materials.green);
    tube.rotation.x = Math.PI / 2;
    const gripGeo = new THREE.BoxGeometry(0.08, 0.2, 0.08);
    const grip = new THREE.Mesh(gripGeo, materials.darkGray);
    grip.position.set(0, -0.15, -0.1);
    root.add(tube, grip);
  } else if (weaponId === 'granada' || weaponId === 'maiz_pira') {
    const eggGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const eggMat = weaponId === 'granada' ? materials.darkGray : materials.yellow;
    const egg = new THREE.Mesh(eggGeo, eggMat);
    const pinGeo = new THREE.BoxGeometry(0.05, 0.08, 0.05);
    const pin = new THREE.Mesh(pinGeo, materials.red);
    pin.position.y = 0.2;
    root.add(egg, pin);
  } else if (weaponId === 'escopeta') {
    const barrelGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.75, 8);
    const barrel = new THREE.Mesh(barrelGeo, materials.metal);
    barrel.rotation.x = Math.PI / 2;
    const stockGeo = new THREE.BoxGeometry(0.08, 0.16, 0.3);
    const stock = new THREE.Mesh(stockGeo, materials.wood);
    stock.position.set(0, -0.06, -0.3);
    root.add(barrel, stock);
  } else if (weaponId === 'chancla') {
    const soleGeo = new THREE.BoxGeometry(0.26, 0.06, 0.6);
    const sole = new THREE.Mesh(soleGeo, materials.red);
    const strapGeo = new THREE.TorusGeometry(0.12, 0.03, 6, 8, Math.PI);
    const strap = new THREE.Mesh(strapGeo, materials.white);
    strap.position.set(0, 0.06, 0.05);
    root.add(sole, strap);
  } else if (weaponId === 'vela') {
    const waxGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.45, 8);
    const wax = new THREE.Mesh(waxGeo, materials.red);
    const flameGeo = new THREE.ConeGeometry(0.06, 0.14, 6);
    const flame = new THREE.Mesh(flameGeo, materials.gold);
    flame.position.y = 0.28;
    root.add(wax, flame);
  } else if (weaponId === 'mina') {
    const baseGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.1, 8);
    const base = new THREE.Mesh(baseGeo, materials.darkGray);
    const lightGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const light = new THREE.Mesh(lightGeo, materials.red);
    light.position.y = 0.08;
    root.add(base, light);
  } else if (weaponId === 'huevo_oro') {
    const eggGeo = new THREE.SphereGeometry(0.24, 10, 10);
    const egg = new THREE.Mesh(eggGeo, materials.gold);
    const haloGeo = new THREE.TorusGeometry(0.28, 0.03, 6, 16);
    const halo = new THREE.Mesh(haloGeo, materials.white);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.32;
    root.add(egg, halo);
  } else {
    // Default projectile marker
    const eggGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const egg = new THREE.Mesh(eggGeo, materials.white);
    root.add(egg);
  }

  return root;
}

// Toy Crate with mini parachute/umbrella
export function createCrateModel(crateType = 'weapons') {
  const root = new THREE.Group();

  let boxColor = 0x8d5b4c;
  if (crateType === 'health') boxColor = 0xd62828;
  else if (crateType === 'utility') boxColor = 0x2a9d8f;

  const boxGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
  const boxMat = new THREE.MeshLambertMaterial({ color: boxColor });
  const box = new THREE.Mesh(boxGeo, boxMat);
  box.position.y = 0.4;
  box.castShadow = true;
  root.add(box);

  // Parachute / Umbrella on top when dropping
  const chuteGroup = new THREE.Group();
  chuteGroup.position.y = 1.0;
  const canopyGeo = new THREE.ConeGeometry(0.8, 0.45, 8, 1, true);
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0xffd166, side: THREE.DoubleSide });
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.y = 0.6;
  chuteGroup.add(canopy);
  root.add(chuteGroup);

  root.userData = { chuteGroup, box, crateType };
  return root;
}

// Explosive Oil Barrel
export function createBarrelModel() {
  const root = new THREE.Group();
  const barrelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.9, 10);
  const barrelMat = new THREE.MeshLambertMaterial({ color: 0xd62828 });
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  barrel.position.y = 0.45;
  barrel.castShadow = true;

  const ribGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.08, 10);
  const rib1 = new THREE.Mesh(ribGeo, materials.darkGray);
  rib1.position.y = 0.65;
  const rib2 = new THREE.Mesh(ribGeo, materials.darkGray);
  rib2.position.y = 0.25;

  root.add(barrel, rib1, rib2);
  return root;
}

// Tombstone Eggshell
export function createTombstoneModel(name = 'Pollito') {
  const root = new THREE.Group();
  const eggGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.6, 8);
  const eggMat = new THREE.MeshLambertMaterial({ color: 0xdfe7ec });
  const stone = new THREE.Mesh(eggGeo, eggMat);
  stone.position.y = 0.3;
  stone.castShadow = true;

  const crossGeo = new THREE.BoxGeometry(0.12, 0.35, 0.05);
  const cross = new THREE.Mesh(crossGeo, materials.darkGray);
  cross.position.set(0, 0.35, 0.31);

  root.add(stone, cross);
  return root;
}

// Rufo the Fox Boss Mech Model
export function createFoxBossModel() {
  const root = new THREE.Group();

  // Mech body
  const mechBodyGeo = new THREE.BoxGeometry(2.4, 2.2, 2.0);
  const mechMat = new THREE.MeshLambertMaterial({ color: 0x3d314a });
  const mech = new THREE.Mesh(mechBodyGeo, mechMat);
  mech.position.y = 2.0;
  root.add(mech);

  // Fox head poking out on top
  const foxHeadGeo = new THREE.BoxGeometry(1.2, 1.0, 1.2);
  const foxMat = new THREE.MeshLambertMaterial({ color: 0xd94e34 });
  const foxHead = new THREE.Mesh(foxHeadGeo, foxMat);
  foxHead.position.set(0, 3.4, 0.2);

  // Snout
  const snoutGeo = new THREE.ConeGeometry(0.4, 0.8, 4);
  const snout = new THREE.Mesh(snoutGeo, new THREE.MeshLambertMaterial({ color: 0xffedd8 }));
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 3.2, 1.1);

  // Monocle
  const monoGeo = new THREE.TorusGeometry(0.2, 0.04, 8, 16);
  const mono = new THREE.Mesh(monoGeo, materials.gold);
  mono.position.set(0.3, 3.5, 0.82);

  // Giant robotic arms
  const armGeo = new THREE.CylinderGeometry(0.3, 0.35, 1.8, 8);
  const armL = new THREE.Mesh(armGeo, materials.metal);
  armL.position.set(1.5, 2.0, 0.3);
  armL.rotation.z = -0.3;

  const armR = new THREE.Mesh(armGeo, materials.metal);
  armR.position.set(-1.5, 2.0, 0.3);
  armR.rotation.z = 0.3;

  root.add(foxHead, snout, mono, armL, armR);
  return root;
}
