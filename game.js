

const CABINET_KEYS = {
	P1_U: ['w'], P1_D: ['s'], P1_L: ['a'], P1_R: ['d'],
	P1_1: ['u'], P1_2: ['i'], P1_3: ['o'],
	P1_4: ['j'], P1_5: ['k'], P1_6: ['l'],
	P2_U: ['ArrowUp'], P2_D: ['ArrowDown'], P2_L: ['ArrowLeft'], P2_R: ['ArrowRight'],
	P2_1: ['r'], P2_2: ['t'], P2_3: ['y'],
	P2_4: ['f'], P2_5: ['g'], P2_6: ['h'],
	START1: ['Enter'], START2: ['2'],
};

const KEY_TO_ARCADE = {};
for (const [code, keys] of Object.entries(CABINET_KEYS)) {
	for (const key of keys) {
		KEY_TO_ARCADE[key.length === 1 ? key.toLowerCase() : key] = code;
	}
}

const held = Object.create(null);

window.addEventListener('keydown', (e) => {
	const code = KEY_TO_ARCADE[e.key.length === 1 ? e.key.toLowerCase() : e.key];
	if (code) held[code] = true;
});
window.addEventListener('keyup', (e) => {
	const code = KEY_TO_ARCADE[e.key.length === 1 ? e.key.toLowerCase() : e.key];
	if (code) held[code] = false;
});

function preload() {
}

const config={
	type:Phaser.AUTO,
	width:800,
	height:600,
	backgroundColor:'#111',
	pixelArt:true,
	parent:'game-root',
	physics: {
		default: 'arcade',
		arcade: {
			gravity: { y: 800 },
			debug: false
		}
	},
	scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
	scene:{preload, create, update}
};
new Phaser.Game(config);

const LEVEL1_ENEMY_TYPES = [
	'swiftProbe',
	'heavyGunner',
	'stalker',
	'shieldSentinel',
	'bomber',
	'suctioner',
	'shockTank'
];

const BOSS_TYPES = ['scrapGolem', 'swarmMind', 'chaosArchitect'];

const BOSS_NAMES = {
	scrapGolem: 'GOLEM DE CHATARRA',
	swarmMind: 'MENTE ENJAMBRE',
	chaosArchitect: 'ARQUITECTO DEL CAOS'
};

const ENEMY_STATS = {
	swiftProbe: { hp: 45, speed: 205, damage: 10, color: 0xff5e7e, w: 26, h: 20 },
	heavyGunner: { hp: 160, speed: 75, damage: 13, color: 0xb8a37d, w: 42, h: 34 },
	stalker: { hp: 95, speed: 165, damage: 22, color: 0x7d7bff, w: 28, h: 34 },
	shieldSentinel: { hp: 130, speed: 95, damage: 6, color: 0x7dffe3, w: 36, h: 36 },
	bomber: { hp: 110, speed: 88, damage: 15, color: 0xff9a55, w: 34, h: 30 },
	suctioner: { hp: 145, speed: 85, damage: 12, color: 0x7aa2ff, w: 36, h: 36 },
	shockTank: { hp: 280, speed: 65, damage: 26, color: 0xff3a3a, w: 56, h: 44 }
};

function setEnemyState(enemy, state, now, duration) {
	enemy.aiState = state;
	enemy.stateUntil = now + duration;
}

function spawnEnemyProjectile(scene, x, y, vx, vy, color, size, damage, ttl, gravityY) {
	const p = scene.add.rectangle(x, y, size, size, color).setDepth(55);
	scene.physics.add.existing(p);
	if (!p.body) return null;
	p.body.setVelocity(vx, vy);
	p.body.setAllowGravity(!!gravityY);
	if (gravityY) p.body.setGravityY(gravityY);
	p.damage = damage;
	p._consumed = false;
	scene.enemyProjectiles.add(p);
	scene.time.delayedCall(ttl || 2500, () => { if (p && p.active) p.destroy(); });
	return p;
}

function spawnFireHazard(scene, x, y, width, height, damage, ttl) {
	const hz = scene.add.rectangle(x, y, width, height, 0xff7a1a, 0.6).setDepth(45).setStrokeStyle(1, 0xffd27d);
	scene.physics.add.existing(hz);
	if (hz.body) {
		hz.body.setAllowGravity(false);
		hz.body.setImmovable(true);
	}
	hz.damage = damage;
	scene.hazards.add(hz);
	scene.tweens.add({ targets: hz, alpha: { from: 0.65, to: 0.35 }, duration: 300, yoyo: true, repeat: -1 });
	scene.time.delayedCall(ttl || 3200, () => { if (hz && hz.active) hz.destroy(); });
	return hz;
}

function playEnemyDeathFx(scene, enemy) {
	if (!scene || !enemy) return;
	const x = enemy.x;
	const y = enemy.y;
	const baseColor = enemy.baseColor || 0xffffff;
	const ring = scene.add.circle(x, y, Math.max(enemy.width || 24, enemy.height || 24) * 0.28, baseColor, 0.28).setDepth((enemy.depth || 50) + 8);
	scene.tweens.add({ targets: ring, scale: 3.2, alpha: 0, duration: 220, ease: 'Quad.easeOut', onComplete: () => { if (ring && ring.active) ring.destroy(); } });

	const shardCount = enemy.isBoss ? 8 : 4;
	for (let i = 0; i < shardCount; i++) {
		const angle = (Math.PI * 2 * i / shardCount) + Phaser.Math.FloatBetween(-0.18, 0.18);
		const dist = Phaser.Math.Between(4, 12);
		const shard = scene.add.rectangle(x, y, Phaser.Math.Between(5, 9), Phaser.Math.Between(2, 4), baseColor, 1).setDepth((enemy.depth || 50) + 9);
		shard.rotation = angle;
		shard.setPosition(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist);
		scene.tweens.add({
			targets: shard,
			x: x + Math.cos(angle) * Phaser.Math.Between(20, 48),
			y: y + Math.sin(angle) * Phaser.Math.Between(20, 48),
			alpha: 0,
			angle: shard.angle + Phaser.Math.Between(100, 260),
			scaleX: 0.2,
			scaleY: 0.2,
			duration: Phaser.Math.Between(170, 260),
			ease: 'Cubic.easeOut',
			onComplete: () => { if (shard && shard.active) shard.destroy(); }
		});
	}
}

function destroyEnemy(enemy) {
	if (!enemy || !enemy.active) return;
	if (enemy._dying) return;
	enemy._dying = true;
	playEnemyDeathFx(enemy.scene, enemy);
	if (enemy.shieldSprite && enemy.shieldSprite.active) enemy.shieldSprite.destroy();
	if (enemy.auraSprite && enemy.auraSprite.active) enemy.auraSprite.destroy();
	if (enemy.body) {
		enemy.body.enable = false;
		enemy.body.stop();
	}
	enemy.setVelocity && enemy.setVelocity(0, 0);
	enemy.setActive(false);
	enemy.setVisible(false);
	enemy.setAlpha(0);
	const corpse = enemy;
	const scene = enemy.scene;
	if (scene && scene.time) {
		scene.time.delayedCall(260, () => { if (corpse && corpse.destroy) corpse.destroy(); });
	} else if (corpse && corpse.destroy) {
		corpse.destroy();
	}
}

function clampEnemyToArena(enemy) {
	if (!enemy || !enemy.active || !enemy.body) return;
	const minX = 14;
	const maxX = 786;
	const minY = 18;
	const maxY = 566;
	if (enemy.x < minX) {
		enemy.x = minX;
		enemy.body.velocity.x = Math.abs(enemy.body.velocity.x) * 0.6;
	}
	if (enemy.x > maxX) {
		enemy.x = maxX;
		enemy.body.velocity.x = -Math.abs(enemy.body.velocity.x) * 0.6;
	}
	if (enemy.y < minY) {
		enemy.y = minY;
		enemy.body.velocity.y = Math.abs(enemy.body.velocity.y) * 0.5;
	}
	if (enemy.y > maxY) {
		enemy.y = maxY;
		enemy.body.velocity.y = -Math.abs(enemy.body.velocity.y) * 0.5;
	}
}

function findClosestEnemy(scene, x, y, maxDist, exclude, excludedSet) {
	if (!scene || !scene.enemies) return null;
	let best = null;
	let bestD2 = (maxDist || 99999) * (maxDist || 99999);
	scene.enemies.getChildren().forEach((enemy) => {
		if (!enemy || !enemy.active || enemy === exclude) return;
		if (excludedSet && excludedSet.has(enemy)) return;
		const dx = enemy.x - x;
		const dy = enemy.y - y;
		const d2 = (dx * dx) + (dy * dy);
		if (d2 < bestD2) {
			bestD2 = d2;
			best = enemy;
		}
	});
	return best;
}

function clearProceduralLevel(scene) {
	if (!scene) return;
	if (scene.levelTweens && scene.levelTweens.length) {
		scene.levelTweens.forEach((tw) => { if (tw && tw.stop) tw.stop(); });
	}
	scene.levelTweens = [];
	if (scene.levelBlocks && scene.levelBlocks.length) {
		scene.levelBlocks.forEach((block) => { if (block && block.destroy) block.destroy(); });
	}
	scene.levelBlocks = [];
}

function damageProceduralBlock(scene, block, amount) {
	if (!scene || !block || !block.active) return;
	if (typeof block.hp !== 'number') block.hp = 420;
	if (typeof block.resistance !== 'number') block.resistance = 12;
	const effectiveDamage = Math.max(1, Math.round(amount - block.resistance));
	block.hp -= effectiveDamage;
	block.setFillStyle(block.hitColor || 0x5a2c2c, 0.92);
	scene.time.delayedCall(70, () => {
		if (block && block.active) block.setFillStyle(block.baseColor || 0x2b3f34, 0.85);
	});
	if (block.hp <= 0) {
		const puff = scene.add.circle(block.x, block.y, Math.max(block.width, block.height) * 0.7, 0xffaa55, 0.18).setDepth(34);
		scene.tweens.add({ targets: puff, alpha: 0, scale: 1.3, duration: 160, onComplete: () => puff.destroy() });
		block.destroy();
	}
}

function consumeProjectile(scene, proj) {
	if (!proj || proj._consumed || !proj.active) return;
	proj._consumed = true;
	if (proj.body) {
		proj.body.stop();
		proj.body.enable = false;
		proj.body.checkCollision.none = true;
	}
	if (proj.disableBody) proj.disableBody(true, true);
	else {
		proj.setActive(false);
		proj.setVisible(false);
	}
	if (proj.trailFx && proj.trailFx.destroy) proj.trailFx.destroy();
	proj.destroy();
}

function applyKnockback(body, fromX, fromY, strength, verticalBoost) {
	if (!body) return;
	const dx = body.x - fromX;
	const dy = body.y - fromY;
	const len = Math.max(0.001, Math.sqrt((dx * dx) + (dy * dy)));
	const nx = dx / len;
	const ny = dy / len;
	body.velocity.x += nx * strength;
	body.velocity.y += (ny * strength * 0.25) - (verticalBoost || 0);
}

function attachProceduralBlockColliders(scene, block) {
	if (!scene || !block || !block.body) return;
	scene.physics.add.collider(scene.player, block);
	scene.physics.add.collider(scene.enemies, block);
	scene.physics.add.collider(scene.projectiles, block, (proj, hitBlock) => {
		if (!proj || !proj.active || proj._consumed || !hitBlock || !hitBlock.active) return;
		proj._consumed = true;
		const dmg = typeof proj.blockDamage === 'number' ? proj.blockDamage : Math.max(3, Math.round((proj.baseDamage || 10) * 0.45));
		damageProceduralBlock(scene, hitBlock, dmg);
		consumeProjectile(scene, proj);
	});
	scene.physics.add.collider(scene.enemyProjectiles, block, (proj) => {
		if (!proj || !proj.active || proj._consumed) return;
		proj._consumed = true;
		if (proj.body && proj.body.gravity && proj.body.gravity.y > 0) {
			spawnFireHazard(scene, proj.x, proj.y, 44, 14, (proj.damage || 14), 1800);
		}
		consumeProjectile(scene, proj);
	});
}

function generateProceduralLevel(scene, isBoss) {
	clearProceduralLevel(scene);
	const baseCount = isBoss ? Phaser.Math.Between(6, 9) : Phaser.Math.Between(5, 8);
	const cycle = (scene.gameFlow && scene.gameFlow.cycle) || 1;
	const count = Phaser.Math.Clamp(baseCount + Math.floor(cycle * 0.55), 5, 13);
	scene.levelBlocks = [];
	scene.levelTweens = [];
	const blocksData = [];

	const addBlock = (x, y, w, h, canMove) => {
		const margin = 16;
		const overlaps = blocksData.some((b) => Math.abs(b.x - x) < ((b.w + w) * 0.5 + margin) && Math.abs(b.y - y) < ((b.h + h) * 0.5 + margin));
		if (overlaps) return false;
		blocksData.push({ x, y, w, h, canMove });
		return true;
	};

	// Base navigable spine: guarantees reachable jump flow instead of fully random clutter.
	const laneX = [140, 280, 420, 560, 700];
	const laneShift = Phaser.Math.Between(-1, 1) * 24;
	const startY = Phaser.Math.Between(470, 520);
	for (let i = 0; i < laneX.length; i++) {
		const y = Phaser.Math.Clamp(startY - i * Phaser.Math.Between(38, 62), 210, 530);
		const w = Phaser.Math.Between(90, 145);
		const h = Phaser.Math.Between(14, 22);
		addBlock(Phaser.Math.Clamp(laneX[i] + laneShift, 70, 730), y, w, h, Math.random() < (isBoss ? 0.45 : 0.30));
	}

	let safety = 0;
	while (blocksData.length < count && safety < 140) {
		safety++;
		const w = Phaser.Math.Between(68, 170);
		const h = Phaser.Math.Between(12, 24);
		const x = Phaser.Math.Between(70, 730);
		const y = Phaser.Math.Between(130, 510);
		const canMove = Math.random() < (isBoss ? 0.55 : 0.40);
		addBlock(x, y, w, h, canMove);
	}

	for (let i = 0; i < blocksData.length; i++) {
		const data = blocksData[i];
		const w = data.w;
		const h = data.h;
		const x = data.x;
		const y = data.y;
		const color = isBoss ? 0x30465a : 0x2b3f34;
		const block = scene.add.rectangle(x, y, w, h, color, 0.85).setDepth(35).setStrokeStyle(2, 0x8ad7ff, 0.6);
		scene.physics.add.existing(block);
		if (!block.body) continue;
		block.body.setAllowGravity(false);
		block.body.setImmovable(true);
		block.body.setCollideWorldBounds(true);
		block.body.setFrictionX(1);
		block.body.setFrictionY(1);
		block.baseColor = color;
		block.hitColor = isBoss ? 0x55739a : 0x6f3a3a;
		block.hp = Math.round((w * h) / (isBoss ? 90 : 60)) + Math.floor(cycle * 10) + (isBoss ? 70 : 55);
		block.resistance = isBoss ? 18 : 12;

		const shouldMove = !!data.canMove;
		if (shouldMove) {
			const axisX = Math.random() > 0.5;
			const amp = Phaser.Math.Between(34, isBoss ? 110 : 90);
			const dur = Phaser.Math.Between(1700, 3200);
			const target = axisX
				? { x: Phaser.Math.Clamp(x + (Math.random() > 0.5 ? amp : -amp), 60, 740) }
				: { y: Phaser.Math.Clamp(y + (Math.random() > 0.5 ? amp : -amp), 100, 520) };
			const tw = scene.tweens.add({
				targets: block,
				...target,
				duration: dur,
				ease: 'Sine.inOut',
				yoyo: true,
				repeat: -1
			});
			scene.levelTweens.push(tw);
		}

		scene.levelBlocks.push(block);
		attachProceduralBlockColliders(scene, block);
	}
}

function pickEnemySet() {
	return Phaser.Utils.Array.Shuffle(LEVEL1_ENEMY_TYPES.slice()).slice(0, 3);
}

function formatEnemyLabel(type) {
	const map = {
		swiftProbe: 'Sonda Veloz',
		heavyGunner: 'Artillero Pesado',
		stalker: 'Acechador',
		shieldSentinel: 'Centinela Escudo',
		bomber: 'Bombardero',
		suctioner: 'Succionador',
		shockTank: 'Tanque Choque'
	};
	return map[type] || type;
}

function spawnBoss(scene, bossType) {
	let boss = null;
	const now = scene.time.now;
	if (bossType === 'scrapGolem') {
		boss = scene.add.rectangle(400, 250, 150, 150, 0x8f8f8f).setStrokeStyle(4, 0xd8d8d8).setDepth(60);
		scene.physics.add.existing(boss);
		boss.body.setCollideWorldBounds(true);
		boss.body.setBounce(0.02);
		boss.body.setDragX(260);
		boss.hp = 1700;
		boss.damage = 30;
		boss.aiState = 'march';
		boss.stateUntil = now + 1200;
		boss.throwCount = 0;
	}
	if (bossType === 'swarmMind') {
		boss = scene.add.rectangle(400, 180, 120, 120, 0xc451ff).setStrokeStyle(4, 0xffd0ff).setDepth(60);
		scene.physics.add.existing(boss);
		boss.body.setAllowGravity(false);
		boss.body.setImmovable(true);
		boss.hp = 1450;
		boss.damage = 20;
		boss.aiState = 'swarm';
		boss.stateUntil = now + 1400;
		boss.spawned = 0;
	}
	if (bossType === 'chaosArchitect') {
		boss = scene.add.rectangle(400, 160, 130, 130, 0x44ffe0).setStrokeStyle(4, 0xb7fff2).setDepth(60);
		scene.physics.add.existing(boss);
		boss.body.setAllowGravity(false);
		boss.body.setImmovable(true);
		boss.hp = 1550;
		boss.damage = 18;
		boss.aiState = 'patternA';
		boss.stateUntil = now + 1400;
		boss.spiralAngle = 0;
	}

	if (!boss) return null;
	boss.enemyType = bossType;
	boss.isBoss = true;
	boss.baseColor = boss.fillColor;
	scene.enemies.add(boss);
	if (scene.floor && boss.body && boss.body.allowGravity) scene.physics.add.collider(boss, scene.floor);
	return boss;
}

function updateBossAI(scene, boss, now, delta) {
	if (!boss || !boss.active || !scene.player || !scene.player.active) return;
	const px = scene.player.x;
	const py = scene.player.y;

	if (boss.enemyType === 'scrapGolem') {
		if (boss.aiState === 'march') {
			const dir = px > boss.x ? 1 : -1;
			boss.body.setVelocityX(dir * 120);
			if (now >= boss.stateUntil) {
				boss.aiState = 'throw';
				boss.stateUntil = now + 1200;
				boss.throwCount = 0;
			}
		} else if (boss.aiState === 'throw') {
			boss.body.setVelocityX(boss.body.velocity.x * 0.8);
			if (!boss.lastThrow || now > boss.lastThrow + 250) {
				boss.lastThrow = now;
				boss.throwCount++;
				const dx = px - boss.x;
				const rock = spawnEnemyProjectile(scene, boss.x, boss.y - 40, Phaser.Math.Clamp(dx * 1.2, -250, 250), -320, 0xb1b1b1, 15, 22, 2400, 540);
				if (rock) {
					scene.physics.add.collider(rock, scene.floor, () => {
						if (!rock.active) return;
						spawnFireHazard(scene, rock.x, 560, 70, 14, 25, 1600);
						rock.destroy();
					});
				}
			}
			if (boss.throwCount >= 3 || now >= boss.stateUntil) {
				boss.aiState = 'smashWindup';
				boss.stateUntil = now + 900;
				boss.setFillStyle(0xffb347);
			}
		} else if (boss.aiState === 'smashWindup') {
			boss.body.setVelocityX(0);
			if (now >= boss.stateUntil) {
				boss.aiState = 'smash';
				boss.stateUntil = now + 220;
				boss.didSmash = false;
			}
		} else if (boss.aiState === 'smash') {
			if (!boss.didSmash) {
				boss.didSmash = true;
				boss.setFillStyle(0xff3a3a);
				spawnFireHazard(scene, 400, 560, 780, 20, 35, 680);
				if (scene.player.body && scene.player.body.touching.down && scene.damagePlayerDirect) scene.damagePlayerDirect(36);
			}
			if (now >= boss.stateUntil) {
				boss.aiState = 'march';
				boss.stateUntil = now + 1300;
				boss.setFillStyle(boss.baseColor);
			}
		}
		return;
	}

	if (boss.enemyType === 'swarmMind') {
		boss.y = 175 + Math.sin(now * 0.003) * 22;
		if (boss.aiState === 'swarm') {
			if (!boss.lastSpawn || now > boss.lastSpawn + 360) {
				boss.lastSpawn = now;
				const p = spawnEnemyByType(scene, 'swiftProbe');
				if (p) {
					p.x = boss.x + Phaser.Math.Between(-80, 80);
					p.y = boss.y + Phaser.Math.Between(-40, 40);
				}
				boss.spawned++;
			}
			if (!boss.lastShot || now > boss.lastShot + 550) {
				boss.lastShot = now;
				for (let i = -2; i <= 2; i++) {
					const angle = Phaser.Math.Angle.Between(boss.x, boss.y, px, py) + i * 0.16;
					spawnEnemyProjectile(scene, boss.x, boss.y + 10, Math.cos(angle) * 250, Math.sin(angle) * 250, 0xff6cff, 9, 16, 2200, 0);
				}
			}
			if (now >= boss.stateUntil) {
				boss.aiState = 'pulse';
				boss.stateUntil = now + 900;
			}
		} else {
			if (!boss.lastPulse || now > boss.lastPulse + 180) {
				boss.lastPulse = now;
				for (let j = 0; j < 10; j++) {
					const a = (Math.PI * 2 * j) / 10;
					spawnEnemyProjectile(scene, boss.x, boss.y, Math.cos(a) * 220, Math.sin(a) * 220, 0xe59cff, 8, 14, 2200, 0);
				}
			}
			if (now >= boss.stateUntil) {
				boss.aiState = 'swarm';
				boss.stateUntil = now + 1300;
			}
		}
		return;
	}

	if (boss.enemyType === 'chaosArchitect') {
		boss.x = 400 + Math.sin(now * 0.002) * 180;
		boss.y = 160 + Math.cos(now * 0.0026) * 45;
		if (boss.aiState === 'patternA') {
			if (!boss.lastRing || now > boss.lastRing + 340) {
				boss.lastRing = now;
				for (let i = 0; i < 14; i++) {
					const a = (Math.PI * 2 * i) / 14 + (now * 0.0015);
					spawnEnemyProjectile(scene, boss.x, boss.y, Math.cos(a) * 240, Math.sin(a) * 240, 0x4fffe0, 8, 15, 3000, 0);
				}
			}
			if (now >= boss.stateUntil) {
				boss.aiState = 'patternB';
				boss.stateUntil = now + 1600;
			}
		} else {
			boss.spiralAngle += 0.01 * (delta / 16.66);
			if (!boss.lastSpiral || now > boss.lastSpiral + 90) {
				boss.lastSpiral = now;
				for (let k = 0; k < 2; k++) {
					const a = boss.spiralAngle + k * Math.PI;
					spawnEnemyProjectile(scene, boss.x, boss.y, Math.cos(a) * 320, Math.sin(a) * 320, 0x00ffd0, 7, 13, 2600, 0);
				}
			}
			if (now >= boss.stateUntil) {
				boss.aiState = 'patternA';
				boss.stateUntil = now + 1450;
			}
		}
	}
}

function refillEnemyQueue(scene) {
	const source = scene.activeEnemyPool && scene.activeEnemyPool.length ? scene.activeEnemyPool : LEVEL1_ENEMY_TYPES;
	scene.levelSpawnQueue = Phaser.Utils.Array.Shuffle(source.slice());
}

function initLevel1EnemySystem(scene, now, pool, maxEnemies, spawnMin, spawnMax) {
	scene.activeEnemyPool = pool && pool.length ? pool.slice() : LEVEL1_ENEMY_TYPES.slice();
	refillEnemyQueue(scene);
	scene.nextEnemySpawnAt = now + 800;
	scene.maxEnemies = maxEnemies || 15;
	scene.spawnDelayMin = spawnMin || 350;
	scene.spawnDelayMax = spawnMax || 850;
	scene.enemyWave = 1;
}

function spawnEnemyByType(scene, type) {
	const s = ENEMY_STATS[type];
	if (!s) return null;
	const spawnLeft = Math.random() > 0.5;
	const spawnX = spawnLeft ? Phaser.Math.Between(30, 110) : Phaser.Math.Between(690, 770);
	const spawnY = Phaser.Math.Between(110, 200);
	const enemy = scene.add.rectangle(spawnX, spawnY, s.w, s.h, s.color).setStrokeStyle(2, 0xffffff).setDepth(50);
	scene.physics.add.existing(enemy);
	if (!enemy.body) return null;
	enemy.body.setCollideWorldBounds(true);
	enemy.body.setBounce(0.08);
	enemy.enemyType = type;
	enemy.baseColor = s.color;
	enemy.hp = s.hp;
	enemy.maxHp = s.hp;
	enemy.damage = s.damage;
	enemy.moveSpeed = s.speed;
	enemy.lastAction = 0;
	enemy.shielded = false;
	enemy.swarmSign = Math.random() > 0.5 ? 1 : -1;

	if (type === 'swiftProbe') {
		enemy.body.setAllowGravity(false);
		setEnemyState(enemy, 'swarm', scene.time.now, 900);
		enemy.aggression = 1.2;
	}
	if (type === 'heavyGunner') {
		setEnemyState(enemy, 'position', scene.time.now, 850);
		enemy.burstShotsLeft = 0;
		enemy.aggression = 0.95;
	}
	if (type === 'stalker') {
		setEnemyState(enemy, 'cloak', scene.time.now, 900);
		enemy.alpha = 0.2;
		enemy.fearHp = Math.round(s.hp * 0.32);
	}
	if (type === 'shieldSentinel') {
		setEnemyState(enemy, 'guard', scene.time.now, 700);
		enemy.shieldRadius = 130;
		enemy.aggression = 0.8;
		enemy.shieldSprite = scene.add.circle(enemy.x, enemy.y, enemy.shieldRadius, 0x7dffe3, 0.11).setDepth(40).setStrokeStyle(2, 0x7dffe3, 0.4);
	}
	if (type === 'bomber') {
		setEnemyState(enemy, 'aim', scene.time.now, 900);
		enemy.aggression = 1.1;
	}
	if (type === 'suctioner') {
		setEnemyState(enemy, 'pull', scene.time.now, 1050);
		enemy.auraSprite = scene.add.circle(enemy.x, enemy.y, 95, 0x7aa2ff, 0.1).setDepth(41).setStrokeStyle(1, 0x7aa2ff, 0.45);
		enemy.aggression = 0.9;
	}
	if (type === 'shockTank') {
		setEnemyState(enemy, 'aim', scene.time.now, 950);
		enemy.chargeDir = 1;
		enemy.body.setBounce(0.02);
		enemy.aggression = 1.25;
	}

	scene.enemies.add(enemy);
	return enemy;
}

function updateEnemyAI(scene, enemy, now, delta) {
	if (!enemy || !enemy.active || !enemy.body || !scene.player || !scene.player.active) return;

	const px = scene.player.x;
	const py = scene.player.y;

	if (enemy.enemyType === 'shieldSentinel') {
		enemy.shielded = false;
		if (enemy.shieldSprite && enemy.shieldSprite.active) {
			enemy.shieldSprite.setPosition(enemy.x, enemy.y);
			enemy.shieldSprite.visible = enemy.aiState !== 'relocate';
		}
	}
	if (enemy.enemyType === 'suctioner' && enemy.auraSprite && enemy.auraSprite.active) {
		enemy.auraSprite.setPosition(enemy.x, enemy.y);
	}

	if (enemy.aiState === 'stunned') {
		if (now >= enemy.stateUntil) setEnemyState(enemy, 'recover', now, 300);
		return;
	}

	switch (enemy.enemyType) {
		case 'swiftProbe': {
			if (enemy.aiState === 'swarm') {
				const dir = px > enemy.x ? 1 : -1;
				const orbitVelY = Math.sin(now * 0.01 + enemy.y * 0.02) * 120 * enemy.swarmSign;
				enemy.body.setVelocity(dir * enemy.moveSpeed, orbitVelY);
				if (now >= enemy.stateUntil) setEnemyState(enemy, 'dash', now, 400);
			} else if (enemy.aiState === 'dash') {
				const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, px, py);
				enemy.body.setVelocity(Math.cos(angle) * (enemy.moveSpeed + 260), Math.sin(angle) * (enemy.moveSpeed + 260));
				if (now >= enemy.stateUntil) setEnemyState(enemy, 'recover', now, 420);
			} else {
				enemy.body.setVelocity(enemy.body.velocity.x * 0.94, enemy.body.velocity.y * 0.94);
				if (now >= enemy.stateUntil) setEnemyState(enemy, 'swarm', now, Phaser.Math.Between(700, 1100));
			}
			break;
		}
		case 'heavyGunner': {
			if (enemy.aiState === 'position') {
				const desiredX = px + (enemy.x < px ? -150 : 150);
				const dx = desiredX - enemy.x;
				enemy.body.setVelocityX(Phaser.Math.Clamp(dx * 2.6, -enemy.moveSpeed * 1.1, enemy.moveSpeed * 1.1));
				if (now >= enemy.stateUntil) {
					enemy.burstShotsLeft = 5;
					setEnemyState(enemy, 'burst', now, 1200);
				}
			} else if (enemy.aiState === 'burst') {
				enemy.body.setVelocityX(enemy.body.velocity.x * 0.85);
				if (!enemy.lastBurstShot || now > enemy.lastBurstShot + 140) {
					enemy.lastBurstShot = now;
					enemy.burstShotsLeft--;
					const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, px, py) + Phaser.Math.FloatBetween(-0.15, 0.15);
					spawnEnemyProjectile(scene, enemy.x, enemy.y - 6, Math.cos(angle) * 330, Math.sin(angle) * 330, 0xffd36b, 10, enemy.damage, 2200, 0);
					if (enemy.burstShotsLeft <= 0) setEnemyState(enemy, 'position', now, Phaser.Math.Between(700, 1100));
				}
			}
			break;
		}
		case 'stalker': {
			const afraid = enemy.hp <= (enemy.fearHp || 0);
			if (enemy.aiState === 'cloak') {
				enemy.alpha = 0.18;
				enemy.body.setVelocityX((px > enemy.x ? 1 : -1) * (enemy.moveSpeed + 40));
				if (now >= enemy.stateUntil) setEnemyState(enemy, 'strike', now, 320);
			} else if (enemy.aiState === 'strike') {
				enemy.alpha = 1;
				const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, px, py);
				enemy.body.setVelocity(Math.cos(angle) * 360, Math.sin(angle) * 140);
				if (now >= enemy.stateUntil) setEnemyState(enemy, 'retreat', now, 700);
			} else {
				enemy.alpha = afraid ? 0.8 : 0.5;
				enemy.body.setVelocityX((px > enemy.x ? -1 : 1) * (enemy.moveSpeed + (afraid ? 70 : 20)));
				if (afraid && now >= enemy.stateUntil) setEnemyState(enemy, 'retreat', now, 900);
				if (now >= enemy.stateUntil) setEnemyState(enemy, 'cloak', now, Phaser.Math.Between(750, 1200));
			}
			break;
		}
		case 'shieldSentinel': {
			if (enemy.aiState === 'guard') {
				enemy.body.setVelocityX((px > enemy.x ? 1 : -1) * enemy.moveSpeed * 0.55);
				scene.enemies.getChildren().forEach((ally) => {
					if (!ally || !ally.active || ally === enemy) return;
					const d = Phaser.Math.Distance.Between(enemy.x, enemy.y, ally.x, ally.y);
					ally.shielded = d <= enemy.shieldRadius;
					if (ally.shielded) ally.setStrokeStyle(2, 0x7dffe3);
					else ally.setStrokeStyle(2, 0xffffff);
				});
				if (now >= enemy.stateUntil) setEnemyState(enemy, 'pulse', now, 340);
			} else if (enemy.aiState === 'pulse') {
				enemy.body.setVelocityX(0);
				if (!enemy.lastPulse || now > enemy.lastPulse + 180) {
					enemy.lastPulse = now;
					spawnEnemyProjectile(scene, enemy.x, enemy.y, (px > enemy.x ? 1 : -1) * 240, -40, 0x7dffe3, 8, enemy.damage, 1100, 0);
				}
				if (now >= enemy.stateUntil) setEnemyState(enemy, 'relocate', now, 700);
			} else {
				enemy.body.setVelocityX((px > enemy.x ? -1 : 1) * enemy.moveSpeed);
				if (now >= enemy.stateUntil) setEnemyState(enemy, 'guard', now, Phaser.Math.Between(620, 980));
			}
			break;
		}
		case 'bomber': {
			if (enemy.aiState === 'aim') {
				enemy.body.setVelocityX((px > enemy.x ? -1 : 1) * enemy.moveSpeed * 0.8);
				if (now >= enemy.stateUntil) setEnemyState(enemy, 'lob', now, 700);
			} else if (enemy.aiState === 'lob') {
				enemy.body.setVelocityX(0);
				if (!enemy.lastBomb || now > enemy.lastBomb + 420) {
					enemy.lastBomb = now;
					const dx = px - enemy.x;
					const bomb = spawnEnemyProjectile(scene, enemy.x, enemy.y - 8, Phaser.Math.Clamp(dx * 1.25, -210, 210), -320, 0xff9a55, 12, enemy.damage + 2, 2400, 520);
					if (bomb) {
						scene.physics.add.collider(bomb, scene.floor, () => {
							if (!bomb.active) return;
							spawnFireHazard(scene, bomb.x, 558, 56, 18, enemy.damage + 3, 3500);
							bomb.destroy();
						});
					}
				}
				if (now >= enemy.stateUntil) setEnemyState(enemy, 'aim', now, Phaser.Math.Between(700, 1200));
			}
			break;
		}
		case 'suctioner': {
			if (enemy.aiState === 'pull') {
				enemy.body.setVelocityX((px > enemy.x ? 1 : -1) * enemy.moveSpeed * 0.5);
				const d = Phaser.Math.Distance.Between(enemy.x, enemy.y, px, py);
				if (d < 280 && scene.player.body) {
					const pull = Phaser.Math.Clamp((280 - d) * 0.55, 25, 120);
					const dir = new Phaser.Math.Vector2(enemy.x - px, enemy.y - py).normalize();
					scene.player.body.velocity.x += dir.x * pull * (delta / 16.66);
					scene.player.body.velocity.y += dir.y * pull * 0.25 * (delta / 16.66);
				}
				if (!enemy.lastPulse || now > enemy.lastPulse + 650) {
					enemy.lastPulse = now;
					spawnEnemyProjectile(scene, enemy.x, enemy.y, (px > enemy.x ? 1 : -1) * 190, 0, 0x7aa2ff, 10, enemy.damage, 1500, 0);
				}
				if (now >= enemy.stateUntil) setEnemyState(enemy, 'recover', now, 520);
			} else {
				enemy.body.setVelocityX((px > enemy.x ? -1 : 1) * enemy.moveSpeed);
				if (now >= enemy.stateUntil) setEnemyState(enemy, 'pull', now, Phaser.Math.Between(900, 1300));
			}
			break;
		}
		case 'shockTank': {
			if (enemy.aiState === 'aim') {
				enemy.body.setVelocityX((px > enemy.x ? 1 : -1) * enemy.moveSpeed * 0.8);
				enemy.chargeDir = px > enemy.x ? 1 : -1;
				if (now >= enemy.stateUntil) setEnemyState(enemy, 'charge', now, 520);
			} else if (enemy.aiState === 'charge') {
				enemy.body.setVelocityX(enemy.chargeDir * 450);
				if (!enemy.lastSlam || now > enemy.lastSlam + 180) {
					enemy.lastSlam = now;
					spawnFireHazard(scene, enemy.x + enemy.chargeDir * 18, 562, 34, 12, enemy.damage - 5, 620);
				}
				if (now >= enemy.stateUntil) setEnemyState(enemy, 'recover', now, 850);
			} else {
				enemy.body.setVelocityX(enemy.body.velocity.x * 0.88);
				if (now >= enemy.stateUntil) setEnemyState(enemy, 'aim', now, Phaser.Math.Between(750, 1100));
			}
			break;
		}
		default:
			break;
	}
}

function create() {
	/* ========================================================================= */
	/* ASSETS & GRAPHICS ZONE */
	/* ========================================================================= */
	/* All visual assets (sprites, backgrounds, UI elements) should be managed here. */
	if (!this.textures.exists('gal1')) {
		const g = this.add.graphics();
		g.fillStyle(0x08131d, 1).fillRect(0, 0, 256, 256);
		g.fillStyle(0x0f2430, 1).fillRect(0, 0, 256, 100);
		g.fillStyle(0x15384a, 1).fillRect(0, 100, 256, 40);
		g.fillStyle(0x1f5166, 0.9).fillCircle(50, 80, 36).fillCircle(190, 150, 58);
		g.lineStyle(2, 0x7cf6ff, 0.12);
		for (let i = 0; i < 10; i++) g.strokeLineShape(new Phaser.Geom.Line(0, i * 26, 256, 256 - i * 18));
		g.generateTexture('gal1', 256, 256);
		g.destroy();
	}
	
	/* Setup stylized title */
	const titleText = this.add.text(400, 150, 'FRACTURE\nSYSTEM', {
		fontFamily: 'monospace',
		fontSize: 72,
		align: 'center',
		color: '#0ff',
		fontStyle: 'bold',
		stroke: '#000',
		strokeThickness: 8,
		shadow: { offsetX: 0, offsetY: 0, color: '#0ff', blur: 20, stroke: true, fill: true },
		padding: { left: 20, right: 20, top: 20, bottom: 20 }
	}).setOrigin(0.5);

	/* Setup play button */
	const playBtn = this.add.text(400, 350, 'PLAY', {
		fontFamily: 'monospace',
		fontSize: 48,
		color: '#fff',
		backgroundColor: '#333',
		padding: { x: 20, y: 10 }
	}).setOrigin(0.5).setInteractive({useHandCursor: true});

	playBtn.on('pointerover', () => playBtn.setStyle({ color: '#ff0', backgroundColor: '#555' }));
	playBtn.on('pointerout', () => playBtn.setStyle({ color: '#fff', backgroundColor: '#333' }));

	/* ========================================================================= */
	/* LOGIC ZONE */
	/* ========================================================================= */
	playBtn.on('pointerdown', () => {
		const scene = this;
		titleText.setVisible(false);
		playBtn.setVisible(false);
		
		/* Stop any previous loop if any */
		window._chipLoop && window._chipLoop.stop && window._chipLoop.stop();
		
		const ctx = window._audioCtx || (window._audioCtx = new(window.AudioContext || window.webkitAudioContext)());
		if(ctx.state === 'suspended') ctx.resume();
		let running = true;
		function stop() { running = false; }
		window._chipLoop = { stop };

		/* ========================================================================= */
		/* AUDIO LOOPS ZONE */
		/* ========================================================================= */
		const MUSIC_MIX = 0.15;
		const SFX_MIX = 1.35;
		/* Helpers */
		function pl(type, freq, gain, atk, sus, rel) {
			if (!freq) return;
			const o = ctx.createOscillator(), g = ctx.createGain();
			o.type = type; o.frequency.value = freq;
			const t = ctx.currentTime;
			g.gain.setValueAtTime(0, t);
			g.gain.linearRampToValueAtTime(gain * MUSIC_MIX, t + atk);
			g.gain.setValueAtTime(gain * MUSIC_MIX * .78, t + atk + sus);
			g.gain.linearRampToValueAtTime(0, t + atk + sus + rel);
			o.connect(g); g.connect(ctx.destination);
			o.start(t); o.stop(t + atk + sus + rel + .01);
			o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (_) {} };
		}
		function kick(v) {
			const o = ctx.createOscillator(), g = ctx.createGain();
			const t = ctx.currentTime;
			o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(26, t + .09);
			g.gain.setValueAtTime(v * MUSIC_MIX, t); g.gain.exponentialRampToValueAtTime(.001, t + .09);
			o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + .1);
			o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (_) {} };
		}
		function snare(v) {
			const len = Math.ceil(ctx.sampleRate * .13), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
			for (let j = 0; j < len; j++) d[j] = Math.random() * 2 - 1;
			const src = ctx.createBufferSource(); src.buffer = buf;
			const flt = ctx.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = 2500; flt.Q.value = .9;
			const g = ctx.createGain(); const t = ctx.currentTime;
			g.gain.setValueAtTime(v * MUSIC_MIX, t); g.gain.exponentialRampToValueAtTime(.001, t + .13);
			src.connect(flt); flt.connect(g); g.connect(ctx.destination); src.start(t); src.stop(t + .14);
			src.onended = () => { try { src.disconnect(); flt.disconnect(); g.disconnect(); } catch (_) {} };
		}
		function hihat(v, dur) {
			const len = Math.ceil(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
			for (let j = 0; j < len; j++) d[j] = Math.random() * 2 - 1;
			const src = ctx.createBufferSource(); src.buffer = buf;
			const flt = ctx.createBiquadFilter(); flt.type = 'highpass'; flt.frequency.value = 7800;
			const g = ctx.createGain(); const t = ctx.currentTime;
			g.gain.setValueAtTime(v * MUSIC_MIX, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
			src.connect(flt); flt.connect(g); g.connect(ctx.destination); src.start(t); src.stop(t + dur + .01);
			src.onended = () => { try { src.disconnect(); flt.disconnect(); g.disconnect(); } catch (_) {} };
		}
		function sfxTone(type, f0, f1, dur, gain) {
			const o = ctx.createOscillator();
			const g = ctx.createGain();
			const t = ctx.currentTime;
			o.type = type;
			o.frequency.setValueAtTime(Math.max(1, f0 || 1), t);
			if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
			g.gain.setValueAtTime(gain * SFX_MIX, t);
			g.gain.exponentialRampToValueAtTime(0.001, t + dur);
			o.connect(g);
			g.connect(ctx.destination);
			o.start(t);
			o.stop(t + dur + 0.01);
			o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (_) {} };
		}
		function sfxNoise(freq, q, dur, gain) {
			const len = Math.ceil(ctx.sampleRate * dur);
			const buf = ctx.createBuffer(1, len, ctx.sampleRate);
			const d = buf.getChannelData(0);
			for (let j = 0; j < len; j++) d[j] = (Math.random() * 2 - 1) * (1 - (j / len));
			const src = ctx.createBufferSource();
			src.buffer = buf;
			const flt = ctx.createBiquadFilter();
			flt.type = 'bandpass';
			flt.frequency.value = freq;
			flt.Q.value = q;
			const g = ctx.createGain();
			const t = ctx.currentTime;
			g.gain.setValueAtTime(gain * SFX_MIX, t);
			g.gain.exponentialRampToValueAtTime(0.001, t + dur);
			src.connect(flt);
			flt.connect(g);
			g.connect(ctx.destination);
			src.start(t);
			src.stop(t + dur + 0.01);
			src.onended = () => { try { src.disconnect(); flt.disconnect(); g.disconnect(); } catch (_) {} };
		}

		scene.playWeaponSfx = (kind) => {
			if (!window._combatActive) return;
			if (ctx.state === 'suspended') ctx.resume();
			if (kind === 'body1') {
				// Filo plasma: slash brillante + aire cortado.
				sfxTone('sawtooth', 520, 210, 0.09, 0.07);
				sfxNoise(2100, 1.2, 0.06, 0.03);
				return;
			}
			if (kind === 'body2') {
				// Rayo encadenado: pulso eléctrico digital.
				sfxTone('square', 340, 690, 0.11, 0.06);
				sfxTone('triangle', 680, 300, 0.12, 0.04);
				return;
			}
			if (kind === 'weapon1') {
				// Cañon nexo circular: disparo compacto con cuerpo grave.
				sfxTone('triangle', 220, 95, 0.12, 0.09);
				sfxNoise(900, 0.8, 0.08, 0.025);
				return;
			}
			if (kind === 'weapon2') {
				// Proyectil homing: tono ascendente de seguimiento.
				sfxTone('sine', 280, 760, 0.14, 0.06);
				sfxTone('square', 160, 320, 0.12, 0.03);
			}
		};

		const music = { mode: 'shop', t: 0 };
		function setMusicMode(mode) {
			music.mode = mode;
			music.t = 0;
		}

		const ost = {
			shop: {
				stepMs: 125,
				mel: [
					392, 392, 440, 493, 523, 587, 659, 784,
					784, 659, 587, 523, 493, 440, 392, 493,
					587, 659, 784, 880, 784, 659, 587, 523,
					493, 587, 659, 784, 659, 587, 493, 392
				],
				chd: [
					[392, 493, 587], [523, 659, 784], [587, 740, 880], [523, 659, 784],
					[392, 493, 587], [440, 587, 659], [587, 740, 880], [392, 493, 587]
				],
				arp: [392, 493, 587, 659, 784, 880, 784, 659],
				bss: [196, 131, 165, 196, 196, 220, 165, 196]
			},
			phase1: {
				stepMs: 98,
				mel: [
					587, 0, 587, 523, 466, 0, 440, 0,
					392, 440, 466, 0, 523, 0, 587, 0,
					698, 0, 698, 587, 523, 0, 466, 0,
					440, 466, 523, 0, 554, 0, 587, 0
				],
				counter: [293, 349, 392, 349, 293, 262, 220, 262],
				bass: [147, 147, 147, 147, 116, 116, 116, 116, 174, 174, 174, 174, 110, 110, 110, 110],
				melGain: 0.15,
				counterGain: 0.065,
				bassGain: 0.14,
				counterEvery: 4,
				bassEvery: 2,
				hh: 0.14,
				drums: true
			},
			phase2: {
				stepMs: 88,
				mel: [
					784, 740, 698, 659, 740, 698, 659, 622,
					698, 659, 622, 587, 659, 622, 587, 554,
					740, 698, 659, 622, 698, 659, 622, 587,
					659, 622, 587, 554, 587, 554, 523, 494
				],
				counter: [392, 440, 466, 440, 392, 349, 330, 349],
				bass: [220, 220, 220, 220, 196, 196, 196, 196, 174, 174, 174, 174, 147, 147, 147, 147],
				melGain: 0.15,
				counterGain: 0.068,
				bassGain: 0.16,
				counterEvery: 4,
				bassEvery: 2,
				hh: 0.16,
				drums: true
			},
			boss: {
				stepMs: 74,
				mel: [
					523, 523, 659, 784, 880, 784, 659, 523,
					494, 494, 622, 740, 831, 740, 622, 494,
					523, 587, 659, 740, 831, 740, 659, 587,
					523, 494, 466, 440, 392, 440, 466, 494
				],
				counter: [262, 311, 349, 392, 349, 311, 262, 220],
				bass: [131, 131, 131, 131, 98, 98, 98, 98, 147, 147, 147, 147, 110, 110, 110, 110],
				melGain: 0.18,
				counterGain: 0.072,
				bassGain: 0.18,
				counterEvery: 4,
				bassEvery: 2,
				hh: 0.2,
				drums: true
			},
			victory: {
				stepMs: 118,
				mel: [523, 659, 784, 1047, 784, 659, 523, 0],
				bass: [131, 131, 165, 165, 196, 196, 262, 262],
				melGain: 0.15,
				bassGain: 0.12,
				hh: 0.06,
				drums: false
			},
			defeat: {
				stepMs: 150,
				mel: [392, 0, 349, 0, 311, 0, 262, 0],
				bass: [98, 98, 87, 87, 73, 73, 65, 65],
				melGain: 0.12,
				bassGain: 0.1,
				hh: 0.04,
				drums: false
			}
		};

		function loop() {
			if (!running) return;
			const mode = ost[music.mode] || ost.shop;
			if (music.mode === 'shop') {
				const s = music.t % 32;
				pl('triangle', mode.mel[s], .18, .007, .10, .04);
				if (s % 2 === 1) pl('square', mode.arp[s % 8], .08, .004, .04, .02);
				if (s % 4 === 0) {
					for (const f of mode.chd[(s / 4) % 8]) pl('triangle', f, .052, .01, .18, .06);
					pl('triangle', mode.bss[(s / 4) % 8], .13, .005, .28, .06);
				}
				if (music.t % 16 === 0) kick(.12);
				if (music.t % 8 === 4) snare(.07);
				if (s % 2 === 0) hihat(.03, .06);
				music.t++;
				setTimeout(loop, mode.stepMs);
				return;
			}
			const s = music.t % mode.mel.length;
			pl('square', mode.mel[s], mode.melGain, .004, .07, .025);
			const counterEvery = mode.counterEvery || 4;
			const bassEvery = mode.bassEvery || 2;
			if (mode.counter && mode.counter.length && s % counterEvery === 0) {
				pl('sawtooth', mode.counter[Math.floor(s / counterEvery) % mode.counter.length], mode.counterGain || 0.06, .008, .14, .04);
			}
			if (mode.bass && mode.bass.length && s % bassEvery === 0) {
				pl('triangle', mode.bass[Math.floor(s / bassEvery) % mode.bass.length], mode.bassGain, .005, .22, .06);
			}
			if (mode.drums) {
				const d = music.t % 16;
				if (d === 0 || d === 8) kick(0.7);
				if (d === 4 || d === 12) snare(0.38);
			}
			if (music.t % 2 === 0) hihat(mode.hh, 0.046);
			music.t++;
			setTimeout(loop, mode.stepMs);
		}
		loop();

		scene.player = scene.add.rectangle(400, 300, 32, 32, 0x00ffcc).setStrokeStyle(2, 0xffffff).setDepth(80);
		scene.physics.add.existing(scene.player);
		scene.player.body.setCollideWorldBounds(true);
		scene.player.body.setBounce(0.1);
		scene.player.body.setDrag(0.9);

		scene.floor = scene.add.rectangle(400, 580, 800, 40, 0x333333).setStrokeStyle(2, 0x555555);
		scene.physics.add.existing(scene.floor, true);
		scene.physics.add.collider(scene.player, scene.floor);

		scene.playerState = {
			body1Level: 1,
			body2Level: 1,
			weapon1Level: 1,
			weapon2Level: 1,
			damageLevel: 1,
			defenseLevel: 1,
			speedLevel: 1,
			stabilityLevel: 1,
			facingRight: true,
			lastBody1Time: 0,
			lastBody2Time: 0,
			lastWeapon1Time: 0,
			lastWeapon2Time: 0,
			invulnUntil: 0,
			hp: 100,
			maxHp: 100,
			credits: 1500
		};

		scene.hpBarBg = scene.add.rectangle(400, 60, 304, 24, 0x550000).setOrigin(0.5, 0.5).setDepth(100);
		scene.hpBar = scene.add.rectangle(250, 60, 300, 20, 0x00ff00).setOrigin(0, 0.5).setDepth(101);
		scene.hpText = scene.add.text(400, 60, 'HP: 100/100', { fontFamily: 'monospace', fontSize: 16, color: '#fff', fontStyle: 'bold' }).setOrigin(0.5, 0.5).setDepth(102);

		scene.objectiveText = scene.add.text(400, 95, '', {
			fontFamily: 'monospace', fontSize: 14, color: '#9eefff', backgroundColor: '#001318', padding: { x: 10, y: 6 }
		}).setOrigin(0.5).setDepth(102);

		scene.combatUi = [scene.player, scene.floor, scene.hpBarBg, scene.hpBar, scene.hpText, scene.objectiveText];

		scene.projectiles = scene.physics.add.group();
		scene.enemies = scene.physics.add.group();
		scene.enemyProjectiles = scene.physics.add.group();
		scene.hazards = scene.physics.add.group();
		scene.physics.add.collider(scene.enemies, scene.floor);

		scene.updateHpUi = () => {
			scene.hpBar.width = (scene.playerState.hp / scene.playerState.maxHp) * 300;
			scene.hpText.setText('HP: ' + scene.playerState.hp + '/' + scene.playerState.maxHp);
			scene.hpBar.fillColor = scene.playerState.hp <= 25 ? 0xff0000 : (scene.playerState.hp <= 50 ? 0xffff00 : 0x00ff00);
		};

		scene.damagePlayerDirect = (incoming) => {
			const now = scene.time.now;
			if (now <= (scene.playerState.invulnUntil || 0)) return;
			scene.playerState.invulnUntil = now + 750;
			if (scene.playerInvulnTween && scene.playerInvulnTween.stop) scene.playerInvulnTween.stop();
			scene.player.setAlpha(1);
			scene.playerInvulnTween = scene.tweens.add({
				targets: scene.player,
				alpha: { from: 0.35, to: 1 },
				duration: 85,
				yoyo: true,
				repeat: 7,
				onComplete: () => { if (scene.player && scene.player.active) scene.player.setAlpha(1); }
			});
			scene.player.setFillStyle(0xff0000);
			scene.time.delayedCall(180, () => { if (scene.player && scene.player.active) scene.player.setFillStyle(0x00ffcc); });
			let dmg = incoming - (scene.playerState.defenseLevel * 2);
			if (dmg < 3) dmg = 3;
			scene.playerState.hp -= dmg;
			applyKnockback(scene.player.body, scene.player.x - (scene.player.body.velocity.x >= 0 ? 18 : -18), scene.player.y, 60, 10);
			if (scene.playerState.hp < 0) scene.playerState.hp = 0;
			scene.updateHpUi();
			if (scene.playerState.hp <= 0) {
				setMusicMode('defeat');
				window._combatActive = false;
				scene.add.text(400, 300, 'GAME OVER', { fontSize: '64px', color: '#ff0000', fontStyle: 'bold', backgroundColor: '#000', padding: { x: 20, y: 20 } }).setOrigin(0.5).setDepth(220);
			}
		};

		scene.onEnemyDefeated = (enemy) => {
			if (!enemy) return;
			const wasBoss = !!enemy.isBoss;
			destroyEnemy(enemy);
			if (wasBoss) {
				window._combatActive = false;
				setMusicMode('victory');
				scene.gameFlow.cycle = (scene.gameFlow.cycle || 1) + 1;
				scene.gameFlow.stepIndex = 0;
				scene.gameFlow.phasePools = {
					phase1: pickEnemySet(),
					phase2: pickEnemySet()
				};
				scene.gameFlow.bossType = Phaser.Utils.Array.GetRandom(BOSS_TYPES);
				scene.objectiveText.setText('CICLO ' + (scene.gameFlow.cycle - 1) + ' COMPLETADO');
				const winText = scene.add.text(400, 300, 'CICLO SUPERADO', {
					fontFamily: 'monospace', fontSize: 58, color: '#00ffd0', fontStyle: 'bold', backgroundColor: '#001010', padding: { x: 20, y: 12 }
				}).setOrigin(0.5).setDepth(220);
				scene.time.delayedCall(1200, () => { if (winText && winText.active) winText.destroy(); });
				scene.time.delayedCall(1300, () => {
					if (scene.showShop) scene.showShop();
				});
				return;
			}
			if (scene.runState && scene.runState.kind === 'phase') {
				scene.runState.kills++;
				scene.objectiveText.setText('FASE ' + (scene.runState.phaseId === 'phase1' ? '1' : '2') + ' - Eliminaciones: ' + scene.runState.kills + '/' + scene.runState.targetKills);
				if (scene.runState.kills >= scene.runState.targetKills) {
					window._combatActive = false;
					scene.gameFlow.stepIndex++;
					scene.time.delayedCall(500, () => {
						if (scene.showShop) scene.showShop();
					});
				}
			}
		};

		scene.damageEnemy = (enemy, amount, sourceX, sourceY) => {
			if (!enemy || !enemy.active) return;
			let finalDamage = amount;
			if (enemy.shielded) finalDamage *= 0.5;
			enemy.hp -= finalDamage;
			if (enemy.body) applyKnockback(enemy.body, sourceX === undefined ? scene.player.x : sourceX, sourceY === undefined ? scene.player.y : sourceY, 180, 18);
			if (enemy.hp <= 0) {
				scene.onEnemyDefeated(enemy);
				return;
			}
			enemy.setFillStyle(0xff0000);
			scene.time.delayedCall(90, () => {
				if (enemy && enemy.active) enemy.setFillStyle(enemy.baseColor);
			});
		};

		scene.physics.add.overlap(scene.projectiles, scene.enemies, (proj, enemy) => {
			if (!proj || !proj.active || proj._consumed || !enemy || !enemy.active) return;
			consumeProjectile(scene, proj);
			const baseDamage = proj.baseDamage || 10;
			scene.damageEnemy(enemy, baseDamage * scene.playerState.damageLevel, proj.x, proj.y);
		});

		scene.physics.add.overlap(scene.player, scene.enemies, (p, e) => {
			if (scene.playerState.invulnUntil && scene.time.now <= scene.playerState.invulnUntil) return;
			if (e && e.body) applyKnockback(scene.player.body, e.x, e.y, 40, 6);
			scene.damagePlayerDirect((e && e.damage) || 20);
		});
		scene.physics.add.overlap(scene.player, scene.enemyProjectiles, (p, ep) => {
			if (scene.playerState.invulnUntil && scene.time.now <= scene.playerState.invulnUntil) return;
			if (ep && ep.body) applyKnockback(scene.player.body, ep.x, ep.y, 28, 4);
			scene.damagePlayerDirect((ep && ep.damage) || 18);
			if (ep && ep.active) ep.destroy();
		});
		scene.physics.add.overlap(scene.player, scene.hazards, (p, hz) => {
			if (scene.playerState.invulnUntil && scene.time.now <= scene.playerState.invulnUntil) return;
			if (hz && hz.body) applyKnockback(scene.player.body, hz.x, hz.y, 24, 3);
			scene.damagePlayerDirect((hz && hz.damage) || 15);
		});

		scene.debugButtons = [];

		scene.shopItems = [];
		scene.clearShop = () => {
			scene.shopItems.forEach((i) => { if (i && i.destroy) i.destroy(); });
			scene.shopItems = [];
		};

		scene.clearCombat = () => {
			scene.enemies.getChildren().forEach(e => destroyEnemy(e));
			scene.enemyProjectiles.clear(true, true);
			scene.hazards.clear(true, true);
			clearProceduralLevel(scene);
			if (scene.debugText) scene.debugText.setText('');
		};

		scene.startStep = () => {
			scene.clearShop();
			scene.clearCombat();
			const step = scene.gameFlow.steps[scene.gameFlow.stepIndex];
			window._combatActive = true;
			scene.combatUi.forEach((item) => { if (item && item.setVisible) item.setVisible(true); });
			scene.player.setPosition(400, 300);
			scene.player.body.setVelocity(0, 0);

			if (step === 'phase1' || step === 'phase2') {
				setMusicMode(step);
				generateProceduralLevel(scene, false);
				const pool = scene.gameFlow.phasePools[step];
					const cycle = scene.gameFlow.cycle || 1;
					const levelNumber = ((cycle - 1) * 2) + (step === 'phase1' ? 1 : 2);
					const phaseMaxEnemies = 3 + levelNumber;
				scene.runState = {
					kind: 'phase',
					phaseId: step,
						levelNumber,
					kills: 0,
					targetKills: step === 'phase1' ? 18 : 26
				};
					initLevel1EnemySystem(scene, scene.time.now, pool, phaseMaxEnemies, step === 'phase1' ? 450 : 320, step === 'phase1' ? 900 : 700);
					scene.objectiveText.setText('NIVEL ' + levelNumber + ' (FASE ' + (step === 'phase1' ? '1' : '2') + ') - Eliminaciones: 0/' + scene.runState.targetKills);
				return;
			}

			setMusicMode('boss');
			generateProceduralLevel(scene, true);
			scene.runState = { kind: 'boss', bossType: scene.gameFlow.bossType };
			scene.objectiveText.setText('BOSS - ' + BOSS_NAMES[scene.gameFlow.bossType]);
			spawnBoss(scene, scene.gameFlow.bossType);
		};

		scene.createShopBtn = (x, y, text, color, price, onBuy) => {
			const container = scene.add.container(x, y);
			const bg = scene.add.rectangle(0, 0, 280, 40, color, 0.6).setStrokeStyle(2, color).setInteractive({ useHandCursor: true });
			const txt = scene.add.text(-125, -10, text, { fontFamily: 'monospace', fontSize: 15, color: '#fff', fontStyle: 'bold' });
			const prc = scene.add.text(75, -10, price + '💎', { fontFamily: 'monospace', fontSize: 15, color: '#ffea00', fontStyle: 'bold' });
			container.add([bg, txt, prc]);
			bg.on('pointerover', () => { bg.setFillStyle(color, 1); txt.setTint(0xffff00); });
			bg.on('pointerout', () => { bg.setFillStyle(color, 0.6); txt.clearTint(); });
			bg.on('pointerdown', () => {
				if (scene.playerState.credits < price) return;
				scene.playerState.credits -= price;
				onBuy && onBuy();
				if (scene.shopCredits) scene.shopCredits.setText('CRÉDITOS: ' + scene.playerState.credits + ' 💎');
			});
			scene.shopItems.push(container);
			return container;
		};

		scene.showShop = () => {
			window._combatActive = false;
			scene.clearCombat();
			scene.player.body.setVelocity(0, 0);
			scene.combatUi.forEach((item) => { if (item && item.setVisible) item.setVisible(false); });
			setMusicMode('shop');
			scene.clearShop();

			const nextStep = scene.gameFlow.steps[scene.gameFlow.stepIndex] || 'phase1';

			const shopBg = scene.add.image(400, 300, 'gal1').setDisplaySize(800, 600).setAlpha(0.2);
			const uiBg = scene.add.rectangle(400, 300, 760, 560, 0x001122, 0.8).setStrokeStyle(4, 0x00ffff);
			const shopTitle = scene.add.text(400, 60, 'TERMINAL DE SUMINISTROS', {
				fontFamily: 'monospace', fontSize: 32, color: '#0ff', fontStyle: 'bold', stroke: '#0055ff', strokeThickness: 4,
				shadow: { offsetX: 0, offsetY: 0, color: '#0ff', blur: 10, stroke: true, fill: true }
			}).setOrigin(0.5);

			scene.shopCredits = scene.add.text(50, 45, 'CRÉDITOS: ' + scene.playerState.credits + ' 💎 | CICLO: ' + (scene.gameFlow.cycle || 1), {
				fontFamily: 'monospace', fontSize: 18, color: '#ffea00', fontStyle: 'bold', stroke: '#000', strokeThickness: 2
			});
			scene.shopItems.push(shopBg, uiBg, shopTitle, scene.shopCredits);

			const createLabel = (x, y, text, color) => {
				const lbl = scene.add.text(x, y, text, {
					fontFamily: 'monospace', fontSize: 20, color: color, fontStyle: 'bold', stroke: '#000', strokeThickness: 4,
					shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 2, fill: true }
				}).setOrigin(0.5);
				const line = scene.add.rectangle(x, y + 15, 240, 2, parseInt(color.replace('#', '0x'), 16));
				scene.shopItems.push(lbl, line);
			};

			createLabel(220, 130, '▶ MEJORAS', '#ffaa00');
			scene.createShopBtn(220, 175, 'Cañón Nexo (Distancia)', 0x664400, 300, () => {
				scene.playerState.weapon1Level++;
				scene.playerState.weapon2Level++;
			});
			scene.createShopBtn(220, 225, 'Filo Plasma (Cuerpo)', 0x664400, 280, () => {
				scene.playerState.body1Level++;
				scene.playerState.body2Level++;
			});

			createLabel(580, 130, '▶ BUFFS', '#00ff00');
			scene.createShopBtn(580, 175, '+ Daño', 0x004400, 220 + (scene.playerState.damageLevel * 30), () => { scene.playerState.damageLevel++; });
			scene.createShopBtn(580, 225, '+ Defensa', 0x004400, 200 + (scene.playerState.defenseLevel * 28), () => { scene.playerState.defenseLevel++; });
			scene.createShopBtn(580, 275, '+ Velocidad', 0x004400, 180 + (scene.playerState.speedLevel * 25), () => { scene.playerState.speedLevel++; });
			scene.createShopBtn(580, 325, '+ Estabilidad', 0x004400, 170 + (scene.playerState.stabilityLevel * 25), () => { scene.playerState.stabilityLevel++; });

			createLabel(220, 290, '▶ CONSUMIBLES', '#ff00ff');
			scene.createShopBtn(220, 335, 'Curación', 0x440044, 120, () => {
				scene.playerState.hp = Math.min(scene.playerState.maxHp, scene.playerState.hp + 40);
				scene.updateHpUi();
			});
			scene.createShopBtn(220, 385, 'Granada PEM', 0x440044, 170, () => {
				scene.playerState.damageLevel++;
			});
			scene.createShopBtn(220, 435, 'Sobrecarga', 0x440044, 210, () => {
				scene.playerState.lastHurtTime = scene.time.now + 2400;
			});

			createLabel(580, 390, '▶ HERRAMIENTAS', '#00ffff');
			scene.createShopBtn(580, 435, 'Dron Soporte', 0x004444, 650, () => { scene.playerState.weapon2Level += 2; });
			scene.createShopBtn(580, 485, 'Botas Magnéticas', 0x004444, 420, () => { scene.playerState.speedLevel += 1; scene.playerState.stabilityLevel += 1; });

			let previewText = '';
			if (nextStep === 'phase1' || nextStep === 'phase2') {
				const set = scene.gameFlow.phasePools[nextStep].map(formatEnemyLabel);
				previewText = 'PRÓXIMA FASE (' + (nextStep === 'phase1' ? '1' : '2') + '): ' + set.join(' | ');
			} else {
				previewText = 'BOSS DETECTADO: ' + BOSS_NAMES[scene.gameFlow.bossType];
			}

			const enemiesText = scene.add.text(400, 515, '⚠ ' + previewText, {
				fontFamily: 'monospace', fontSize: 14, color: '#ff3333', align: 'center', backgroundColor: '#220000', padding: { x: 15, y: 8 }, stroke: '#ff0000', strokeThickness: 1
			}).setOrigin(0.5);

			const btnLabel = nextStep === 'phase1' ? 'INICIAR FASE 1 >>' : (nextStep === 'phase2' ? 'INICIAR FASE 2 >>' : 'INICIAR BOSS >>');
			const nextBtnBg = scene.add.rectangle(400, 650, 250, 45, 0x880000).setStrokeStyle(2, 0xff0000).setInteractive({ useHandCursor: true });
			const nextBtnTxt = scene.add.text(400, 650, btnLabel, { fontFamily: 'monospace', fontSize: 18, color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
			nextBtnBg.on('pointerover', () => { nextBtnBg.setFillStyle(0xff0000); nextBtnTxt.setTint(0xffff00); });
			nextBtnBg.on('pointerout', () => { nextBtnBg.setFillStyle(0x880000); nextBtnTxt.clearTint(); });
			nextBtnBg.on('pointerdown', () => scene.startStep());
			scene.tweens.add({ targets: [nextBtnBg, nextBtnTxt], y: 560, duration: 650, ease: 'Power2' });

			scene.shopItems.push(enemiesText, nextBtnBg, nextBtnTxt);
		};

		scene.gameFlow = {
			steps: ['phase1', 'phase2', 'boss'],
			stepIndex: 0,
			cycle: 1,
			phasePools: {
				phase1: pickEnemySet(),
				phase2: pickEnemySet()
			},
			bossType: Phaser.Utils.Array.GetRandom(BOSS_TYPES)
		};

		scene.showShop();
	});
}

function update(time, delta) {
	if (!this.player || !this.player.body) return;
	if (!window._combatActive) return;

	const speed = 250 + (this.playerState.speedLevel - 1) * 30;
	const jumpPower = -450;

	// Update drag based on stability
	this.player.body.setDrag(0.9 + (this.playerState.stabilityLevel * 0.05));

	// Horizontal movement
	if (held.P1_L) {
		this.player.body.setVelocityX(-speed);
		this.playerState.facingRight = false;
	} else if (held.P1_R) {
		this.player.body.setVelocityX(speed);
		this.playerState.facingRight = true;
	} else {
		this.player.body.setVelocityX(0);
	}

	// Jumping (ONLY W/P1_U)
	if (held.P1_U && this.player.body.touching.down) {
		this.player.body.setVelocityY(jumpPower);
	}

	// Attack logic
	// Cuerpo 1 (u): quick area pulse. Level only increases area slightly and attack speed.
	const body1Cooldown = Math.max(430 - (this.playerState.body1Level * 3), 80);
	if (held.P1_1 && time > this.playerState.lastBody1Time + body1Cooldown) {
		this.playerState.lastBody1Time = time;
		if (this.playWeaponSfx) this.playWeaponSfx('body1');
		const radius = Math.min(36 + (this.playerState.body1Level * 3.6), 410);
		const areaFx = this.add.circle(this.player.x, this.player.y, radius, 0xff4a66, 0.16).setStrokeStyle(2, 0xff8c9d, 0.85).setDepth(150);
		this.tweens.add({ targets: areaFx, alpha: 0, duration: 110, onComplete: () => areaFx.destroy() });
		this.enemies.getChildren().forEach((enemy) => {
			if (!enemy || !enemy.active) return;
			const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
			if (d <= radius) {
				this.damageEnemy(enemy, 16 * this.playerState.damageLevel);
				if (enemy.body) {
					const dir = new Phaser.Math.Vector2(enemy.x - this.player.x, enemy.y - this.player.y).normalize();
					enemy.body.velocity.x += dir.x * 160;
					enemy.body.velocity.y += dir.y * 110;
				}
			}
		});
	}

	// Cuerpo 2 (i): short chained ray. Level only increases chain count.
	if (held.P1_2 && time > this.playerState.lastBody2Time + 520) {
		this.playerState.lastBody2Time = time;
		if (this.playWeaponSfx) this.playWeaponSfx('body2');
		const chainCount = Math.max(1, this.playerState.body2Level);
		const dirX = this.playerState.facingRight ? 1 : -1;
		const dirY = 0;
		const beamLen = 220;
		const beamHalfWidth = 24;
		let first = null;
		let bestProj = Infinity;
		this.enemies.getChildren().forEach((enemy) => {
			if (!enemy || !enemy.active) return;
			const ex = enemy.x - this.player.x;
			const ey = enemy.y - this.player.y;
			const proj = (ex * dirX) + (ey * dirY);
			if (proj <= 0 || proj > beamLen) return;
			const perp = Math.abs((ex * dirY) - (ey * dirX));
			if (perp > beamHalfWidth) return;
			if (proj < bestProj) {
				bestProj = proj;
				first = enemy;
			}
		});

		const rayFx = this.add.graphics().setDepth(151);
		rayFx.lineStyle(4, 0x8ef8ff, 0.95);
		rayFx.beginPath();
		rayFx.moveTo(this.player.x, this.player.y);
		if (first) {
			const hitSet = new Set();
			let current = first;
			let fromX = this.player.x;
			let fromY = this.player.y;
			for (let hop = 0; hop < chainCount && current; hop++) {
				rayFx.lineTo(current.x, current.y);
				this.damageEnemy(current, 22 * this.playerState.damageLevel);
				hitSet.add(current);
				fromX = current.x;
				fromY = current.y;
				current = findClosestEnemy(this, fromX, fromY, 180, null, hitSet);
			}
		} else {
			rayFx.lineTo(this.player.x + (dirX * beamLen), this.player.y);
		}
		rayFx.strokePath();
		this.time.delayedCall(95, () => { if (rayFx && rayFx.active) rayFx.destroy(); });
	}

	// Arma 1 (j): circular burst from player. Level only changes projectile count.
	if (held.P1_4 && time > this.playerState.lastWeapon1Time + 250) {
		this.playerState.lastWeapon1Time = time;
		if (this.playWeaponSfx) this.playWeaponSfx('weapon1');
		const count = Math.max(1, this.playerState.weapon1Level);
		const baseAngle = this.playerState.facingRight ? 0 : Math.PI;
		const speedW1 = 360;
		for (let i = 0; i < count; i++) {
			const angle = baseAngle + ((Math.PI * 2) * i / count);
			const bullet = this.add.rectangle(this.player.x + Math.cos(angle) * 14, this.player.y + Math.sin(angle) * 14, 8, 8, 0xfff166).setDepth(120);
			this.physics.add.existing(bullet);
			this.projectiles.add(bullet);
			bullet.body.setAllowGravity(false);
			bullet.body.setVelocity(Math.cos(angle) * speedW1, Math.sin(angle) * speedW1);
			bullet.baseDamage = 10;
			bullet.blockDamage = 5;
			bullet._consumed = false;
			this.time.delayedCall(1500, () => { if (bullet.active) bullet.destroy(); });
		}
	}

	// Arma 2 (k): homing shot. Level only increases fire rate and projectile speed.
	const weapon2Cooldown = Math.max(420 - (this.playerState.weapon2Level * 10), 70);
	if (held.P1_5 && time > this.playerState.lastWeapon2Time + weapon2Cooldown) {
		this.playerState.lastWeapon2Time = time;
		if (this.playWeaponSfx) this.playWeaponSfx('weapon2');
		const speedW2 = 190 + (this.playerState.weapon2Level * 14);
		const target = findClosestEnemy(this, this.player.x, this.player.y, 420, null, null);
		const bullet = this.add.rectangle(this.player.x, this.player.y, 10, 10, 0x7bfffb).setDepth(121);
		this.physics.add.existing(bullet);
		this.projectiles.add(bullet);
		bullet.body.setAllowGravity(false);
		bullet.baseDamage = 9;
		bullet.blockDamage = 4;
		bullet.homing = true;
		bullet.homingSpeed = speedW2;
		bullet.turnRate = Math.min(0.12 + (this.playerState.weapon2Level * 0.003), 0.35);
		bullet.target = target;
		bullet._consumed = false;
		if (target) {
			const a = Phaser.Math.Angle.Between(bullet.x, bullet.y, target.x, target.y);
			bullet.body.setVelocity(Math.cos(a) * speedW2, Math.sin(a) * speedW2);
		} else {
			bullet.body.setVelocity((this.playerState.facingRight ? 1 : -1) * speedW2, 0);
		}
		this.time.delayedCall(2500, () => { if (bullet.active) bullet.destroy(); });
	}

	// Cleanup off-screen projectiles
	this.projectiles.getChildren().forEach(p => {
		if (!p || !p.active || p._consumed) return;
		if (this.levelBlocks && this.levelBlocks.length) {
			const pb = p.getBounds();
			for (const block of this.levelBlocks) {
				if (!block || !block.active) continue;
				if (Phaser.Geom.Intersects.RectangleToRectangle(pb, block.getBounds())) {
					const blockDamage = typeof p.blockDamage === 'number' ? p.blockDamage : Math.max(3, Math.round((p.baseDamage || 10) * 0.45));
					p._consumed = true;
					damageProceduralBlock(this, block, blockDamage);
					consumeProjectile(this, p);
					return;
				}
			}
		}
		if (p.homing && p.body) {
			if (!p.target || !p.target.active) p.target = findClosestEnemy(this, p.x, p.y, 420, null, null);
			if (p.target) {
				const a = Phaser.Math.Angle.Between(p.x, p.y, p.target.x, p.target.y);
				const dx = Math.cos(a) * p.homingSpeed;
				const dy = Math.sin(a) * p.homingSpeed;
				p.body.velocity.x = Phaser.Math.Linear(p.body.velocity.x, dx, p.turnRate || 0.12);
				p.body.velocity.y = Phaser.Math.Linear(p.body.velocity.y, dy, p.turnRate || 0.12);
			}
		}
		if (p.x < 0 || p.x > 800 || p.y < -30 || p.y > 630) consumeProjectile(this, p);
	});

	// Enemy spawning (waves that always include all 7 archetypes in random order)
	if (this.enemies && this.runState && this.runState.kind === 'phase') {
		if (!this.debugText) {
			this.debugText = this.add.text(10, 50, '', { fill: '#fff', fontSize: 16, backgroundColor: '#000' });
			this.debugText.setDepth(200); // Ensure it's on top
		}
		this.debugText.setText('Enemies: ' + this.enemies.getChildren().length + ' | Wave: ' + this.enemyWave);

		if (time > this.nextEnemySpawnAt && this.enemies.getChildren().length < this.maxEnemies) {
			if (!this.levelSpawnQueue || this.levelSpawnQueue.length === 0) {
				refillEnemyQueue(this);
				this.enemyWave++;
			}
			const nextType = this.levelSpawnQueue.shift();
			spawnEnemyByType(this, nextType);
			this.nextEnemySpawnAt = time + Phaser.Math.Between(this.spawnDelayMin || 350, this.spawnDelayMax || 850);
		}
	}

	// Enemy AI per archetype
	if (this.enemies) {
		this.enemies.getChildren().forEach(enemy => {
			if (!enemy || !enemy.active || !enemy.body) return; // Prevent crash if destroyed

			if (enemy.hurtByMelee && (enemy.body.touching.down || enemy.body.velocity.y === 0)) {
				enemy.hurtByMelee = false;
			}
			if (enemy.isBoss) updateBossAI(this, enemy, time, delta);
			else updateEnemyAI(this, enemy, time, delta);
			clampEnemyToArena(enemy);
		});
	}

	if (this.enemyProjectiles) {
		this.enemyProjectiles.getChildren().forEach((p) => {
			if (!p || !p.active || p._consumed) return;
			if (p.x < -40 || p.x > 840 || p.y < -40 || p.y > 640) consumeProjectile(this, p);
		});
	}

	if (this.hazards) {
		this.hazards.getChildren().forEach((h) => {
			if (!h || !h.active) return;
			h.rotation += 0.01;
		});
	}
}

