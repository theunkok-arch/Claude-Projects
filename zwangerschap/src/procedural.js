import * as THREE from 'three'

// Gestileerde vervanger voor stadia zonder AI-model. Zijaanzicht, hoofd boven,
// gezicht naar +x: dezelfde oriëntatie als de standaard-hotspots.

const skin = () => new THREE.MeshPhysicalMaterial({
  color: 0xf0a088, roughness: 0.42, sheen: 1, sheenColor: 0xffd6c8, sheenRoughness: 0.5,
  clearcoat: 0.35, clearcoatRoughness: 0.4,
})

function ellipsoid(mat, r, sx, sy, sz) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), mat)
  m.scale.set(sx, sy, sz)
  return m
}

function limb(mat, a, b, r) {
  const len = a.distanceTo(b)
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 16), mat)
  m.position.copy(a).add(b).multiplyScalar(0.5)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
  return m
}

const v = (x, y, z) => new THREE.Vector3(x, y, z)

// Vroeg embryo: een C-vorm van bolletjes met een staartje.
function embryo(stage, mat) {
  const g = new THREE.Group()
  const curve = new THREE.CatmullRomCurve3([
    v(0.15, 0.55, 0), v(-0.35, 0.35, 0), v(-0.45, -0.1, 0), v(-0.2, -0.45, 0), v(0.1, -0.5, 0), v(0.2, -0.35, 0),
  ])
  const n = 40
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const r = THREE.MathUtils.lerp(0.42, 0.06, Math.pow(t, 1.3)) * (stage >= 8 ? 1 : 0.92)
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), mat)
    s.position.copy(curve.getPoint(t))
    g.add(s)
  }
  // Knopjes voor armen en benen.
  const bud = stage >= 8 ? 0.11 : 0.07
  g.add(limb(mat, v(0.0, 0.0, 0.2), v(0.18, -0.02, 0.32), bud))
  g.add(limb(mat, v(-0.15, -0.3, 0.18), v(0.02, -0.38, 0.3), bud))
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshStandardMaterial({ color: 0x2a0d0a }))
  eye.position.set(0.28, 0.42, 0.25)
  g.add(eye)
  return g
}

export function buildFetus(stage) {
  const mat = skin()
  if (stage < 10) return embryo(stage, mat)

  const g = new THREE.Group()
  // Hoofd wordt relatief kleiner naarmate de zwangerschap vordert.
  const p = THREE.MathUtils.clamp((stage - 10) / 30, 0, 1)
  const headR = THREE.MathUtils.lerp(0.5, 0.36, p)
  const plump = THREE.MathUtils.lerp(0.85, 1.15, p)

  const head = ellipsoid(mat, headR, 1, 0.95, 0.9)
  head.position.set(0.12, 0.45, 0)
  g.add(head)

  const body = ellipsoid(mat, 0.42, 0.85 * plump, 1.05, 0.8 * plump)
  body.position.set(-0.08, -0.12, 0)
  body.rotation.z = 0.35
  g.add(body)

  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), new THREE.MeshStandardMaterial({ color: 0x2a0d0a, roughness: 0.2 }))
  eye.position.set(0.12 + headR * 0.82, 0.45 + headR * 0.05, headR * 0.45)
  eye.scale.set(1, 0.6, 1)
  g.add(eye)

  const ear = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 10, 20), mat)
  ear.position.set(0.05, 0.4, headR * 0.88)
  g.add(ear)

  const armR = 0.07 * plump
  for (const z of [0.22, -0.22]) {
    const sh = v(0.12, 0.1, z)
    const el = v(0.12, -0.12, z * 1.2)
    const hand = v(0.42, 0.18, z * 0.8)
    g.add(limb(mat, sh, el, armR))
    g.add(limb(mat, el, hand, armR * 0.9))
    const palm = ellipsoid(mat, 0.07, 1, 0.8, 0.5)
    palm.position.copy(hand)
    g.add(palm)
  }

  const legR = 0.085 * plump
  for (const z of [0.2, -0.2]) {
    const hip = v(-0.2, -0.42, z)
    const knee = v(0.3, -0.25, z * 1.1)
    const foot = v(0.05, -0.62, z * 0.9)
    g.add(limb(mat, hip, knee, legR))
    g.add(limb(mat, knee, foot, legR * 0.85))
    const f = ellipsoid(mat, 0.08, 1.4, 0.6, 0.8)
    f.position.copy(foot)
    g.add(f)
  }

  const cord = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v(0.2, -0.3, 0), v(0.6, -0.5, 0.1), v(0.9, -0.2, -0.3), v(1.4, -0.6, -0.6)]), 40, 0.045, 12),
    new THREE.MeshPhysicalMaterial({ color: 0xe8b8b8, roughness: 0.3, clearcoat: 0.6 }),
  )
  g.add(cord)
  return g
}
