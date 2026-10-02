import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import './style.css'
import {
  DUE_DATE, NAME, WEEKS, MIN_WEEK, MAX_WEEK, stageFor,
  HOTSPOTS, DEFAULT_HOTSPOT_POS, STAGE_HOTSPOT_POS,
} from './weeks.js'
import { buildFetus } from './procedural.js'

const DAY = 86400000
const EDIT = new URLSearchParams(location.search).has('edit')
const $ = (id) => document.getElementById(id)

// ---------- Datums ----------

function localDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const lmp = new Date(localDate(DUE_DATE).getTime() - 280 * DAY)
const today = new Date(); today.setHours(0, 0, 0, 0)
const daysPregnant = Math.round((today - lmp) / DAY)
const nowWeek = Math.min(MAX_WEEK, Math.max(MIN_WEEK, Math.floor(daysPregnant / 7)))

const fmt = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' })
function weekRange(w) {
  const start = new Date(lmp.getTime() + w * 7 * DAY)
  const end = new Date(start.getTime() + 6 * DAY)
  return `${fmt.format(start)} t/m ${fmt.format(end)}`
}

// ---------- Scene ----------

const canvas = $('scene')
const stageEl = $('stage')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100)
camera.position.set(0.4, 0.2, 6)

scene.add(new THREE.HemisphereLight(0xfff1e8, 0x8a2a1a, 1.4))
const key = new THREE.DirectionalLight(0xfff4ec, 2.2)
key.position.set(3, 4, 5)
scene.add(key)
const rim = new THREE.DirectionalLight(0xffc7a8, 2.5)
rim.position.set(-4, 2, -4)
scene.add(rim)

// Zwevende deeltjes, zoals in het vruchtwater.
{
  const n = 220
  const pos = new Float32Array(n * 3)
  for (let i = 0; i < n * 3; i++) pos[i] = (Math.random() - 0.5) * 9
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const dots = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffe6d8, size: 0.03, transparent: true, opacity: 0.7, depthWrite: false,
  }))
  dots.name = 'dots'
  scene.add(dots)
}

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 2.2
controls.maxDistance = 9
controls.autoRotate = true
controls.autoRotateSpeed = 0.8
controls.addEventListener('start', () => {
  controls.autoRotate = false
  $('hint').style.opacity = 0
  cancelFocus()
})

function resize() {
  const { clientWidth: w, clientHeight: h } = stageEl
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}
new ResizeObserver(resize).observe(stageEl)

// ---------- Modellen ----------

const draco = new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
const loader = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder)
const cache = new Map()

// Laadt het model van een stadium, of bouwt de gestileerde vervanger als er
// (nog) geen bestand is. Geeft een groep terug, gecentreerd en geschaald zodat
// de grootste maat 2 is, met userData.size voor de hotspots.
function loadStage(stage) {
  if (cache.has(stage)) return cache.get(stage)
  const p = loader.loadAsync(`/models/stage-${String(stage).padStart(2, '0')}.glb`)
    .then((gltf) => gltf.scene)
    .catch(() => buildFetus(stage))
    .then(normalize)
  cache.set(stage, p)
  return p
}

function normalize(obj) {
  const box = new THREE.Box3().setFromObject(obj)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const s = 2 / Math.max(size.x, size.y, size.z)
  obj.position.sub(center)
  const wrap = new THREE.Group()
  const inner = new THREE.Group()
  inner.add(obj)
  inner.scale.setScalar(s)
  wrap.add(inner)
  wrap.userData.size = size.multiplyScalar(s)
  return wrap
}

let current = null // { week, stage, group }
let growT = 1

async function showWeek(week) {
  const stage = stageFor(week)
  renderInfo(week)
  if (current?.stage === stage) {
    current.week = week
    current.group.scale.setScalar(weekScale(week, stage))
    buildHotspots()
    return
  }
  $('loading').hidden = false
  const group = await loadStage(stage)
  if (stageFor(selectedWeek) !== stage) return // er is intussen verder geklikt
  $('loading').hidden = true
  if (current) scene.remove(current.group)
  current = { week, stage, group }
  group.userData.target = weekScale(week, stage)
  group.scale.setScalar(0.001)
  growT = 0
  scene.add(group)
  buildHotspots()
}

// Binnen een stadium groeit het model nog een klein beetje mee met de week.
function weekScale(week, stage) {
  return Math.min(1.25, Math.sqrt(WEEKS[week].cm / WEEKS[stage].cm))
}

// ---------- Hotspots ----------

const hotspotEl = $('hotspots')
let spots = [] // { key, el, local: Vector3 }
let activeKey = null

function visibleKeys(week) {
  return Object.keys(HOTSPOTS).filter((k) => HOTSPOTS[k].from <= week)
}

function buildHotspots() {
  hotspotEl.innerHTML = ''
  spots = []
  const chips = $('chips')
  chips.innerHTML = ''
  if (!current) return
  const { week, stage, group } = current
  const size = group.userData.size
  const posTable = { ...DEFAULT_HOTSPOT_POS, ...(STAGE_HOTSPOT_POS[stage] || {}) }
  visibleKeys(week).forEach((k, i) => {
    const n = posTable[k]
    if (!n) return
    const el = document.createElement('button')
    el.className = 'hotspot'
    el.textContent = i + 1
    el.setAttribute('aria-label', HOTSPOTS[k].label)
    el.onclick = () => focusSpot(k)
    hotspotEl.appendChild(el)
    spots.push({ key: k, el, local: new THREE.Vector3(n[0] * size.x, n[1] * size.y, n[2] * size.z) })

    const chip = document.createElement('button')
    chip.textContent = `${i + 1}. ${HOTSPOTS[k].label}`
    chip.dataset.key = k
    chip.onclick = () => {
      focusSpot(k)
      stageEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    chips.appendChild(chip)
  })
  if (activeKey && !spots.some((s) => s.key === activeKey)) closePopup()
  else if (activeKey) markActive(activeKey)
}

const tmp = new THREE.Vector3()
const camDir = new THREE.Vector3()

function updateHotspots() {
  if (!current) return
  const { clientWidth: w, clientHeight: h } = stageEl
  camDir.copy(camera.position).normalize()
  for (const s of spots) {
    tmp.copy(s.local).applyMatrix4(current.group.matrixWorld)
    const facing = tmp.clone().normalize().dot(camDir)
    tmp.project(camera)
    s.el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * w}px, ${(-tmp.y * 0.5 + 0.5) * h}px)`
    s.el.classList.toggle('behind', facing < -0.15)
  }
}

let focus = null // { from, to, t }

function focusSpot(k) {
  const s = spots.find((x) => x.key === k)
  if (!s) return
  controls.autoRotate = false
  $('hint').style.opacity = 0
  const dist = camera.position.length()
  const dir = s.local.clone().applyMatrix4(current.group.matrixWorld).normalize()
  dir.y = THREE.MathUtils.clamp(dir.y, -0.6, 0.6)
  focus = { from: camera.position.clone(), to: dir.normalize().multiplyScalar(Math.min(dist, 4.2)), t: 0 }
  $('popup-title').textContent = HOTSPOTS[k].label
  $('popup-text').textContent = HOTSPOTS[k].text(current.week)
  $('popup').hidden = false
  activeKey = k
  markActive(k)
}

function markActive(k) {
  spots.forEach((s) => s.el.classList.toggle('on', s.key === k))
  $('chips').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.key === k))
}

function cancelFocus() { focus = null }

function closePopup() {
  $('popup').hidden = true
  activeKey = null
  markActive(null)
}
$('popup-close').onclick = closePopup

// ?edit=1: tik op het model om genormaliseerde coördinaten te zien.
if (EDIT) {
  const ray = new THREE.Raycaster()
  const dbg = $('debug')
  dbg.hidden = false
  dbg.textContent = 'edit: tik op het model'
  canvas.addEventListener('click', (e) => {
    if (!current) return
    const r = canvas.getBoundingClientRect()
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera)
    const hit = ray.intersectObject(current.group, true)[0]
    if (!hit) return
    const p = current.group.worldToLocal(hit.point.clone())
    const s = current.group.userData.size
    const n = [p.x / s.x, p.y / s.y, p.z / s.z].map((v) => +v.toFixed(2))
    dbg.textContent = `stage ${current.stage}: [${n.join(', ')}]`
    console.log(current.stage, n)
  })
}

// ---------- Tekst en weekkeuze ----------

let selectedWeek = nowWeek

function renderInfo(week) {
  const d = WEEKS[week]
  $('title').textContent = `${NAME} ${week === nowWeek ? 'deze week' : `in week ${week}`}`
  $('range').textContent = weekRange(week)
  $('len').textContent = d.cm < 1 ? `${Math.round(d.cm * 10)} mm` : `${d.cm.toLocaleString('nl-NL')} cm`
  $('len-lbl').textContent = week < 20 ? 'kruin-stuit' : 'kruin-hiel'
  $('wt').textContent = d.g < 1 ? '< 1 g' : d.g >= 1000 ? `${(d.g / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 2 })} kg` : `${d.g} g`
  $('fruit').innerHTML = `Zo groot als <b>${d.fruit}</b>`
  $('baby').innerHTML = d.baby.map((t) => `<li>${t}</li>`).join('')
  $('mama').innerHTML = d.mama.map((t) => `<li>${t}</li>`).join('')
  document.querySelectorAll('.weeks button').forEach((b) => b.classList.toggle('active', +b.dataset.week === week))
}

const nowDays = daysPregnant - nowWeek * 7
$('today').textContent = daysPregnant < 0 ? '–' : `${nowWeek}w + ${Math.max(0, Math.min(6, nowDays))}d`
const daysLeft = Math.round((localDate(DUE_DATE) - today) / DAY)
$('today-lbl').textContent = daysLeft > 0 ? `nog ${daysLeft} dagen` : 'vandaag'

const nav = $('weeks')
for (let w = MIN_WEEK; w <= MAX_WEEK; w++) {
  const b = document.createElement('button')
  b.dataset.week = w
  b.innerHTML = `<b>${w}</b> ${w === 1 ? 'week' : 'weken'}`
  if (w === nowWeek) b.classList.add('now')
  b.onclick = () => selectWeek(w)
  nav.appendChild(b)
}

function selectWeek(w) {
  selectedWeek = w
  nav.querySelector(`[data-week="${w}"]`).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  showWeek(w)
}

// Swipen over de tekstkaart is te gevoelig; wisselen gaat via de weekbalk.
requestAnimationFrame(() => {
  nav.querySelector(`[data-week="${nowWeek}"]`).scrollIntoView({ inline: 'center', block: 'nearest' })
})
showWeek(nowWeek)
// Volgende en vorige stadium alvast ophalen.
setTimeout(() => {
  ;[stageFor(nowWeek + 4), stageFor(Math.max(MIN_WEEK, nowWeek - 2))].forEach(loadStage)
}, 1500)

// ---------- Loop ----------

const clock = new THREE.Clock()
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05)
  const t = clock.elapsedTime
  if (current) {
    const g = current.group
    if (growT < 1) {
      growT = Math.min(1, growT + dt * 2.2)
      const e = 1 - Math.pow(1 - growT, 3)
      g.scale.setScalar(g.userData.target * e)
      if (growT === 1) g.userData.target = weekScale(current.week, current.stage)
    }
    // Rustig zweven.
    g.position.y = Math.sin(t * 0.8) * 0.04
    g.rotation.z = Math.sin(t * 0.5) * 0.03
  }
  scene.getObjectByName('dots').rotation.y = t * 0.01
  if (focus) {
    focus.t = Math.min(1, focus.t + dt * 1.6)
    const e = 1 - Math.pow(1 - focus.t, 3)
    camera.position.lerpVectors(focus.from, focus.to, e)
    if (focus.t === 1) focus = null
  }
  controls.update()
  renderer.render(scene, camera)
  updateHotspots()
})
