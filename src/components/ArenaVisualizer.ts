import * as THREE from 'three'
import { CameraController } from './CameraController'
import { Camera2DController } from './Camera2DController'
import { Arena } from './Arena'

export class ArenaVisualizer {
  private container: HTMLElement
  private scene: THREE.Scene
  private renderer: THREE.WebGLRenderer
  private camera2D: THREE.OrthographicCamera
  private camera3D: THREE.PerspectiveCamera
  private currentCamera: THREE.Camera
  private cameraController3D: CameraController
  private cameraController2D: Camera2DController
  private currentCameraController: CameraController | Camera2DController
  private arena: Arena
  private clock: THREE.Clock
  private animationId: number | null = null
  private currentMode: '2d' | '3d' = '3d'
  
  // Lighting references and transition state
  private directionalLight1: THREE.DirectionalLight | null = null
  private directionalLight2: THREE.DirectionalLight | null = null
  private targetLight1Intensity: number = 0.4 // Default to paused state
  private targetLight2Intensity: number = 0.3 // Default to paused state
  private lightTransitionSpeed: number = 2.0 // Units per second

  constructor(container: HTMLElement) {
    this.container = container
    this.clock = new THREE.Clock()

    // Initialize Three.js components
    this.initScene()
    this.initRenderer()
    this.initCameras()
    this.initLighting()

    // Initialize camera controllers
    this.cameraController3D = new CameraController(this.camera3D, this.renderer.domElement)
    this.cameraController2D = new Camera2DController(this.camera2D, this.renderer.domElement)
    
    // Start with 3D camera
    this.currentCamera = this.camera3D
    this.currentCameraController = this.cameraController3D
    
    // Initialize arena
    this.arena = new Arena()
    this.scene.add(this.arena.getGroup())
    
    // Initialize 2D labels (they'll be hidden initially)
    this.arena.initialize2DLabels(this.scene)
  }

  private initScene(): void {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x000000)
    this.scene.fog = new THREE.Fog(0x000000, 50, 200)
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance'
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    
    this.container.appendChild(this.renderer.domElement)
  }

  private initCameras(): void {
    // 3D Perspective Camera
    this.camera3D = new THREE.PerspectiveCamera(
      75, // fov
      window.innerWidth / window.innerHeight, // aspect
      0.1, // near
      1000 // far
    )
    // Set camera to the new position
    this.camera3D.position.set(36.41, 12.50, -0.23)
    this.camera3D.lookAt(31.49, 11.64, -0.32)
    
    // 2D Orthographic Camera - positioned for top-down view
    const aspect = window.innerWidth / window.innerHeight
    const frustumSize = 30
    this.camera2D = new THREE.OrthographicCamera(
      frustumSize * aspect / -2, // left
      frustumSize * aspect / 2,  // right
      frustumSize / 2,           // top
      frustumSize / -2,          // bottom
      0.1,                       // near
      1000                       // far
    )
    this.camera2D.position.set(0, 50, 0) // Top-down view
    this.camera2D.lookAt(0, 0, 0)
  }

  private initLighting(): void {
    // Ambient light for general illumination (very minimal intensity with directional lights)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.01)
    this.scene.add(ambientLight)

    // Main directional light (positioned on one side) - start at paused intensity
    this.directionalLight1 = new THREE.DirectionalLight(0xffffff, this.targetLight1Intensity)
    this.directionalLight1.position.set(50, 50, 25)
    this.directionalLight1.target.position.set(0, 0, 0) // Face the origin
    this.directionalLight1.castShadow = true
    this.directionalLight1.shadow.mapSize.width = 2048
    this.directionalLight1.shadow.mapSize.height = 2048
    this.directionalLight1.shadow.camera.near = 0.1
    this.directionalLight1.shadow.camera.far = 200
    this.directionalLight1.shadow.camera.left = -50
    this.directionalLight1.shadow.camera.right = 50
    this.directionalLight1.shadow.camera.top = 50
    this.directionalLight1.shadow.camera.bottom = -50
    this.scene.add(this.directionalLight1)
    this.scene.add(this.directionalLight1.target) // Add target to scene

    // Second directional light (positioned on opposite side) - start at paused intensity
    this.directionalLight2 = new THREE.DirectionalLight(0xffffff, this.targetLight2Intensity)
    this.directionalLight2.position.set(-50, 50, -25) // Opposite position
    this.directionalLight2.target.position.set(0, 0, 0) // Face the origin
    this.directionalLight2.castShadow = true
    this.directionalLight2.shadow.mapSize.width = 2048
    this.directionalLight2.shadow.mapSize.height = 2048
    this.directionalLight2.shadow.camera.near = 0.1
    this.directionalLight2.shadow.camera.far = 200
    this.directionalLight2.shadow.camera.left = -50
    this.directionalLight2.shadow.camera.right = 50
    this.directionalLight2.shadow.camera.top = 50
    this.directionalLight2.shadow.camera.bottom = -50
    this.scene.add(this.directionalLight2)
    this.scene.add(this.directionalLight2.target) // Add target to scene

    console.log('Dual directional lighting setup complete:')
    console.log('- Light 1 position:', this.directionalLight1.position)
    console.log('- Light 1 target:', this.directionalLight1.target.position)
    console.log('- Light 2 position:', this.directionalLight2.position)
    console.log('- Light 2 target:', this.directionalLight2.target.position)
  }


  public start(): void {
    this.animate()
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate)
    
    const deltaTime = this.clock.getDelta()
    
    // Update current camera controller
    this.currentCameraController.update(deltaTime)
    
    // Update arena
    this.arena.update(deltaTime)
    
    // Update lighting transitions
    this.updateLightingTransitions(deltaTime)
    
    // Render the scene
    this.renderer.render(this.scene, this.currentCamera)
  }

  public handleResize(): void {
    const width = window.innerWidth
    const height = window.innerHeight
    
    // Update 3D camera
    this.camera3D.aspect = width / height
    this.camera3D.updateProjectionMatrix()
    
    // Update 2D camera (this will be handled by the 2D controller)
    // but we still need to update the base camera for consistency
    const aspect = width / height
    const frustumSize = 30
    this.camera2D.left = frustumSize * aspect / -2
    this.camera2D.right = frustumSize * aspect / 2
    this.camera2D.top = frustumSize / 2
    this.camera2D.bottom = frustumSize / -2
    this.camera2D.updateProjectionMatrix()
    
    // Notify camera controllers about resize
    this.cameraController2D.handleResize()
    
    // Update renderer
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }

  // Lighting transition methods
  private updateLightingTransitions(deltaTime: number): void {
    if (!this.directionalLight1 || !this.directionalLight2) return
    
    // Smoothly transition light 1 intensity
    const light1Diff = this.targetLight1Intensity - this.directionalLight1.intensity
    if (Math.abs(light1Diff) > 0.001) {
      const light1Step = Math.sign(light1Diff) * this.lightTransitionSpeed * deltaTime
      if (Math.abs(light1Step) >= Math.abs(light1Diff)) {
        this.directionalLight1.intensity = this.targetLight1Intensity
      } else {
        this.directionalLight1.intensity += light1Step
      }
    }
    
    // Smoothly transition light 2 intensity
    const light2Diff = this.targetLight2Intensity - this.directionalLight2.intensity
    if (Math.abs(light2Diff) > 0.001) {
      const light2Step = Math.sign(light2Diff) * this.lightTransitionSpeed * deltaTime
      if (Math.abs(light2Step) >= Math.abs(light2Diff)) {
        this.directionalLight2.intensity = this.targetLight2Intensity
      } else {
        this.directionalLight2.intensity += light2Step
      }
    }
  }
  
  // Dynamic lighting control methods
  public setLightingForVideoState(isPlaying: boolean): void {
    if (isPlaying) {
      // Videos playing - dim lights
      this.targetLight1Intensity = 0.1
      this.targetLight2Intensity = 0.08
      console.log('Transitioning to playing state lighting (dimmer)')
    } else {
      // Videos paused - brighter lights
      this.targetLight1Intensity = 0.4
      this.targetLight2Intensity = 0.3
      console.log('Transitioning to paused state lighting (brighter)')
    }
  }
  
  public updateLightingBasedOnVideoState(): void {
    const videoInfo = this.arena.getVideoPlaybackInfo()
    const hasVideos = videoInfo.videoCount > 0
    const isPlaying = hasVideos && videoInfo.isPlaying
    
    // Only update if there are videos loaded
    if (hasVideos) {
      this.setLightingForVideoState(isPlaying)
    } else {
      // No videos - use paused state lighting
      this.setLightingForVideoState(false)
    }
  }

  // Mode switching method
  public switchMode(mode: '2d' | '3d'): void {
    if (this.currentMode === mode) return
    
    this.currentMode = mode
    
    if (mode === '2d') {
      this.currentCamera = this.camera2D
      this.currentCameraController = this.cameraController2D
      // Set cursor to grab for 2D camera
      this.renderer.domElement.style.cursor = 'grab'
    } else {
      this.currentCamera = this.camera3D
      this.currentCameraController = this.cameraController3D
      // Reset cursor for 3D camera
      this.renderer.domElement.style.cursor = 'default'
    }
    
    console.log(`Switched to ${mode.toUpperCase()} camera mode`)
  }
  
  public getCurrentMode(): '2d' | '3d' {
    return this.currentMode
  }
  
  // Getters for debugging
  public getScene(): THREE.Scene { return this.scene }
  public getCamera(): THREE.Camera { return this.currentCamera }
  public get2DCamera(): THREE.OrthographicCamera { return this.camera2D }
  public get3DCamera(): THREE.PerspectiveCamera { return this.camera3D }
  public getRenderer(): THREE.WebGLRenderer { return this.renderer }
  public getArena(): Arena { return this.arena }
}
