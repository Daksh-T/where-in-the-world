/**
 * GlobeManager — pure Three.js 3D globe
 *
 * Three.js SphereGeometry UV mapping (verified):
 *   - U=0 → lng=-180 (antimeridian, back of sphere at rotation.y=0)
 *   - U=0.5 → lng=0 (prime meridian, front of sphere at rotation.y=0)
 *   - U=1 → lng=+180 (antimeridian again)
 *
 * Camera formula: at lng=0, camera is at (0, 0, +dist) — facing the front of sphere.
 * This means lng=0 (prime meridian) faces the camera. ✓
 *
 * BUT: Three.js sphere is built with the seam at lng=180 facing AWAY (+Z is lng=0).
 * So NO globe rotation needed. The camera formula is:
 *   x = dist * cos(lat) * sin(lng)
 *   y = dist * sin(lat)
 *   z = dist * cos(lat) * cos(lng)
 *
 * At lng=0: camera at (0, 0, dist) → sees prime meridian ✓
 * At lng=90E: camera at (dist, 0, 0) → sees 90°E ✓
 * At lng=138E (Japan): camera at (sin138*dist, 0, cos138*dist) = (0.67d, 0, -0.74d) → sees Japan ✓
 *
 * The overlay canvas maps: x = (lng+180)/360 * SIZE, y = (90-lat)/180 * SIZE
 * This is standard equirectangular. The overlay mesh also needs NO rotation.
 */

import * as THREE from 'three';

const EARTH_DAY_URL  = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const EARTH_BUMP_URL = 'https://unpkg.com/three-globe/example/img/earth-topology.png';
const EARTH_SPEC_URL = 'https://unpkg.com/three-globe/example/img/earth-water.png';
// 50m resolution — much sharper borders than 110m, still fast to load
// Uses Natural Earth 50m which has better Kashmir coverage for India
const GEOJSON_URL    = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';

const GLOBE_RADIUS = 100;

export class GlobeManager {
  constructor(containerEl) {
    this.container = containerEl;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.globe = null;
    this.countriesData = [];
    this.highlightedIso = null;
    this._highlightColor = null;
    this._overlayCanvas = null;
    this._overlayTexture = null;
    this._overlayMesh = null;
    this._markerMesh = null;
    this.isSpinning = false;
    this._spinInterval = null;
    this._currentLat = 15;
    this._currentLng = 0;
    this._currentAlt = 2.5;
    this._labelEl = null;
  }

  async init(onProgress) {
    this._setupScene();
    this._createLabel();
    if (onProgress) onProgress(20);

    await this._loadGlobeTextures(onProgress);
    if (onProgress) onProgress(60);

    this._addAtmosphere();
    this._addStarfield();
    this._startRenderLoop();

    try {
      const res = await fetch(GEOJSON_URL);
      const geo = await res.json();
      this.countriesData = geo.features;
      if (onProgress) onProgress(90);
      this._buildOverlay();
    } catch (e) {
      console.warn('GeoJSON load failed:', e);
    }

    if (onProgress) onProgress(100);
    this._startIdleRotation();
  }

  _setupScene() {
    const w = this.container.clientWidth  || 700;
    const h = this.container.clientHeight || 700;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 10000);
    this._updateCameraFromPOV();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(400, 200, 300);
    this.scene.add(sun);
  }

  async _loadGlobeTextures(onProgress) {
    const loader = new THREE.TextureLoader();
    const loadTex = url => new Promise((res, rej) => loader.load(url, res, undefined, rej));

    try {
      const [dayTex, bumpTex, specTex] = await Promise.all([
        loadTex(EARTH_DAY_URL),
        loadTex(EARTH_BUMP_URL),
        loadTex(EARTH_SPEC_URL).catch(() => null)
      ]);
      if (onProgress) onProgress(50);

      const geo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
      const mat = new THREE.MeshPhongMaterial({
        map: dayTex,
        bumpMap: bumpTex,
        bumpScale: 0.5,
        specularMap: specTex || undefined,
        specular: specTex ? new THREE.Color(0x336688) : undefined,
        shininess: specTex ? 8 : 0
      });
      this.globe = new THREE.Mesh(geo, mat);
      // NO rotation — Three.js sphere UV already has prime meridian facing +Z
      this.scene.add(this.globe);
    } catch (err) {
      console.warn('Texture load failed, using fallback:', err);
      const geo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
      const mat = new THREE.MeshPhongMaterial({ color: 0x2266aa });
      this.globe = new THREE.Mesh(geo, mat);
      this.scene.add(this.globe);
    }
  }

  _addAtmosphere() {
    const geo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.02, 64, 64);
    const mat = new THREE.MeshPhongMaterial({
      color: 0x4488ff, transparent: true, opacity: 0.07,
      side: THREE.FrontSide, depthWrite: false
    });
    this.scene.add(new THREE.Mesh(geo, mat));

    const rimGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.06, 64, 64);
    const rimMat = new THREE.MeshPhongMaterial({
      color: 0x88bbff, transparent: true, opacity: 0.04,
      side: THREE.BackSide, depthWrite: false
    });
    this.scene.add(new THREE.Mesh(rimGeo, rimMat));
  }

  _addStarfield() {
    const positions = [];
    for (let i = 0; i < 2000; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 3000 + Math.random() * 2000;
      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.scene.add(new THREE.Points(geo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 2.5, sizeAttenuation: true })
    ));
  }

  // ─── Country Overlay ─────────────────────────────────────────────────────────

  _buildOverlay() {
    const SIZE = 4096;
    this._overlayCanvas = document.createElement('canvas');
    this._overlayCanvas.width  = SIZE;
    this._overlayCanvas.height = SIZE / 2; // equirectangular is 2:1 ratio
    this._overlayTexture = new THREE.CanvasTexture(this._overlayCanvas);

    const geo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.001, 128, 128);
    const mat = new THREE.MeshBasicMaterial({
      map: this._overlayTexture, transparent: true, depthWrite: false, opacity: 1
    });
    this._overlayMesh = new THREE.Mesh(geo, mat);
    // NO rotation — matches globe
    this.scene.add(this._overlayMesh);
    this._redrawOverlay();
  }

  _redrawOverlay() {
    if (!this._overlayCanvas) return;
    const W   = this._overlayCanvas.width;
    const H   = this._overlayCanvas.height;
    const ctx = this._overlayCanvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    if (!this.highlightedIso || !this.countriesData.length) {
      if (this._overlayTexture) this._overlayTexture.needsUpdate = true;
      return;
    }

    const color = this._highlightColor || 'rgba(255,200,0,0.75)';

    // For India, also include KAS (Siachen Glacier / disputed Kashmir area)
    const isIndia = this.highlightedIso === 'IND';

    for (const feat of this.countriesData) {
      const iso = feat.properties?.ADM0_A3 || feat.properties?.ISO_A3;
      const isKashmirFeature = isIndia && iso === 'KAS';
      if (iso !== this.highlightedIso && !isKashmirFeature) continue;

      ctx.fillStyle   = color;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth   = 4;

      const geom = feat.geometry;
      const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;

      for (const poly of polys) {
        for (const ring of poly) {
          ctx.beginPath();
          for (let i = 0; i < ring.length; i++) {
            const [lng, lat] = ring[i];
            // Equirectangular projection: W is full 360°, H is full 180°
            const x = ((lng + 180) / 360) * W;
            const y = ((90 - lat) / 180) * H;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    }
    this._overlayTexture.needsUpdate = true;
  }

  // ─── Marker pin on globe surface ─────────────────────────────────────────────

  /**
   * Place a glowing dot on the globe surface at the given lat/lng.
   * Uses the same spherical formula as the camera but at radius = GLOBE_RADIUS + small offset.
   */
  _placeMarker(lat, lng) {
    this._removeMarker();

    const latR = lat * (Math.PI / 180);
    const lngR = lng * (Math.PI / 180);
    const r    = GLOBE_RADIUS * 1.015;

    // Same formula as camera: x=cos(lat)*cos(lng), z=-cos(lat)*sin(lng)
    const x =  r * Math.cos(latR) * Math.cos(lngR);
    const y =  r * Math.sin(latR);
    const z = -r * Math.cos(latR) * Math.sin(lngR);

    // Outer glow ring
    const ringGeo = new THREE.RingGeometry(3.5, 6, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.9,
      side: THREE.DoubleSide, depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);

    // Inner dot
    const dotGeo = new THREE.CircleGeometry(2.5, 32);
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0xff4444, transparent: true, opacity: 1,
      side: THREE.DoubleSide, depthWrite: false
    });
    const dot = new THREE.Mesh(dotGeo, dotMat);

    // Group them
    const group = new THREE.Group();
    group.add(ring);
    group.add(dot);
    group.position.set(x, y, z);

    // Orient the marker to face outward from the globe center
    group.lookAt(0, 0, 0);
    group.rotateX(Math.PI); // flip to face outward

    this._markerMesh = group;
    this.scene.add(group);

    // Animate the ring pulsing
    this._pulseMarker();
  }

  _pulseMarker() {
    if (!this._markerMesh) return;
    const ring = this._markerMesh.children[0];
    let scale = 1;
    let growing = true;
    const pulse = () => {
      if (!this._markerMesh) return;
      if (growing) { scale += 0.015; if (scale >= 1.4) growing = false; }
      else         { scale -= 0.015; if (scale <= 1.0) growing = true;  }
      ring.scale.setScalar(scale);
      ring.material.opacity = 0.9 - (scale - 1) * 0.6;
      requestAnimationFrame(pulse);
    };
    pulse();
  }

  _removeMarker() {
    if (this._markerMesh) {
      this.scene.remove(this._markerMesh);
      this._markerMesh = null;
    }
  }

  // ─── Label ───────────────────────────────────────────────────────────────────

  _createLabel() {
    const el = document.createElement('div');
    el.id = 'globeCountryLabel';
    el.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      font-family: 'Space Grotesk', sans-serif;
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
      text-shadow: 0 0 20px rgba(0,212,255,0.9), 0 2px 8px rgba(0,0,0,0.9);
      letter-spacing: 0.04em;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.5s ease;
      white-space: nowrap;
      z-index: 10;
    `;
    this.container.parentElement.appendChild(el);
    this._labelEl = el;
  }

  _showLabel(text) {
    if (!this._labelEl) return;
    this._labelEl.textContent = text;
    this._labelEl.style.opacity = '1';
  }

  _hideLabel() {
    if (!this._labelEl) return;
    this._labelEl.style.opacity = '0';
  }

  // ─── Render Loop ─────────────────────────────────────────────────────────────

  _startRenderLoop() {
    const render = () => {
      requestAnimationFrame(render);
      this.renderer.render(this.scene, this.camera);
    };
    render();
  }

  // ─── Camera ──────────────────────────────────────────────────────────────────

  /**
   * Camera position matching Three.js SphereGeometry UV mapping.
   *
   * From Three.js source (SphereGeometry.js line 69-71):
   *   x = -radius * cos(phi) * sin(theta)   where phi = u * 2π (u=0 → lng=-180, u=0.5 → lng=0)
   *   y =  radius * cos(theta)               (theta = polar angle from top)
   *   z =  radius * sin(phi) * sin(theta)
   *
   * At u=0.5 (lng=0, prime meridian): phi=π → x=+radius, z=0  → prime meridian is at +X
   * At u=0.75 (lng=90E):              phi=3π/2 → x=0, z=-radius → 90°E is at -Z
   *
   * So the camera formula to face a given lng is:
   *   camera_x = dist * cos(lat) * cos(lng_rad)    (lng=0 → +X ✓)
   *   camera_y = dist * sin(lat)
   *   camera_z = dist * cos(lat) * (-sin(lng_rad)) (lng=90E → -Z ✓)
   */
  _updateCameraFromPOV() {
    const lat  = this._currentLat * (Math.PI / 180);
    const lng  = this._currentLng * (Math.PI / 180);
    const dist = GLOBE_RADIUS * this._currentAlt;

    this.camera.position.set(
      dist * Math.cos(lat) * Math.cos(lng),   // X: +X at lng=0
      dist * Math.sin(lat),                    // Y: north
      dist * Math.cos(lat) * (-Math.sin(lng)) // Z: -Z at lng=90E
    );
    this.camera.lookAt(0, 0, 0);
  }

  _animatePOV(targetLat, targetLng, targetAlt, durationMs) {
    return new Promise(resolve => {
      const startLat  = this._currentLat;
      const startLng  = this._currentLng;
      const startAlt  = this._currentAlt;
      const startTime = Date.now();
      const dlng = ((targetLng - startLng) % 360 + 540) % 360 - 180;

      const tick = () => {
        const elapsed  = Date.now() - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        const t        = this._easeInOutCubic(progress);

        this._currentLat = startLat + (targetLat - startLat) * t;
        this._currentLng = startLng + dlng * t;
        this._currentAlt = startAlt + (targetAlt - startAlt) * t;
        this._updateCameraFromPOV();

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          this._currentLat = targetLat;
          this._currentLng = targetLng;
          this._currentAlt = targetAlt;
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }

  _easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  _startIdleRotation() {
    if (this._spinInterval) return;
    this._spinInterval = setInterval(() => {
      if (!this.isSpinning) {
        this._currentLng = (this._currentLng + 0.15) % 360;
        this._updateCameraFromPOV();
      }
    }, 16);
  }

  _stopIdleRotation() {
    if (this._spinInterval) {
      clearInterval(this._spinInterval);
      this._spinInterval = null;
    }
  }

  dramaticSpin(durationMs = 3200) {
    return new Promise(resolve => {
      this.isSpinning = true;
      this._stopIdleRotation();
      this._hideLabel();
      this._removeMarker();

      const startTime = Date.now();
      const startLng  = this._currentLng;
      const startLat  = this._currentLat;
      const startAlt  = this._currentAlt;
      const totalRot  = 1080;

      const animate = () => {
        const elapsed  = Date.now() - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        const eased    = this._easeInOutCubic(progress);

        this._currentLng = (startLng + totalRot * eased) % 360;
        this._currentLat = startLat + Math.sin(progress * Math.PI) * 20;
        this._currentAlt = startAlt - eased * 0.4;
        this._updateCameraFromPOV();

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.isSpinning = false;
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  }

  async settleOnCountry(round) {
    this.isSpinning = true;
    await this._animatePOV(round.targetLat, round.targetLng, round.altitude, 1800);
    this.highlightCountry(round.isoCode, round.highlightColor);
    this._placeMarker(round.targetLat, round.targetLng);
    this._showLabel(`${round.flagEmoji}  ${round.countryName}`);
    this.isSpinning = false;
  }

  highlightCountry(isoCode, color) {
    this.highlightedIso  = isoCode;
    this._highlightColor = color || 'rgba(255,200,0,0.75)';
    this._redrawOverlay();
  }

  clearHighlight() {
    this.highlightedIso  = null;
    this._highlightColor = null;
    this._redrawOverlay();
  }

  resetForNextRound() {
    this.clearHighlight();
    this._hideLabel();
    this._removeMarker();
    this.isSpinning  = false;
    this._currentLat = 15;
    this._currentLng = 0;
    this._currentAlt = 2.5;
    this._updateCameraFromPOV();
    this._startIdleRotation();
  }

  resize(width, height) {
    if (!this.renderer) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}
