import * as THREE from 'three'

export class CameraController {
  private camera: THREE.PerspectiveCamera
  private canvas: HTMLElement
  
  private keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  }

  private mouse = {
    x: 0,
    y: 0,
    isDown: false,
    sensitivity: 0.002,
  }

  private movement = {
    speed: 20,
    boost: 2,
  }

  private spherical = new THREE.Spherical()
  private target = new THREE.Vector3(0, 0, 0)
  private velocity = new THREE.Vector3()
  private direction = new THREE.Vector3()

  constructor(camera: THREE.PerspectiveCamera, canvas: HTMLElement) {
    this.camera = camera
    this.canvas = canvas

    this.initEventListeners()
    
    // Initialize spherical coordinates from camera position
    this.spherical.setFromVector3(this.camera.position.clone().sub(this.target))
    
    // Start zoomed in to the maximum (minimum radius)
    this.spherical.radius = 5
  }

  private initEventListeners(): void {
    // Keyboard events
    window.addEventListener('keydown', this.onKeyDown.bind(this))
    window.addEventListener('keyup', this.onKeyUp.bind(this))

    // Mouse events
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this))
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this))
    window.addEventListener('mouseup', this.onMouseUp.bind(this))
    
    // Wheel event for zoom
    this.canvas.addEventListener('wheel', this.onWheel.bind(this))
    
    // Prevent context menu on right click
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  private onKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true
        break
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true
        break
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true
        break
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true
        break
      case 'KeyQ':
        this.keys.down = true
        break
      case 'KeyE':
        this.keys.up = true
        break
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false
        break
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false
        break
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false
        break
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false
        break
      case 'KeyQ':
        this.keys.down = false
        break
      case 'KeyE':
        this.keys.up = false
        break
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) { // Left mouse button
      this.mouse.isDown = true
      this.mouse.x = event.clientX
      this.mouse.y = event.clientY
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.mouse.isDown) {
      const deltaX = event.clientX - this.mouse.x
      const deltaY = event.clientY - this.mouse.y

      this.spherical.theta -= deltaX * this.mouse.sensitivity
      // Invert the up/down mouse movement by negating deltaY
      this.spherical.phi -= deltaY * this.mouse.sensitivity

      // Limit phi to prevent camera flipping
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi))

      this.mouse.x = event.clientX
      this.mouse.y = event.clientY
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) { // Left mouse button
      this.mouse.isDown = false
    }
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault()
    
    this.spherical.radius += event.deltaY * 0.01
    this.spherical.radius = Math.max(5, Math.min(100, this.spherical.radius))
  }

  public update(deltaTime: number): void {
    // Calculate movement
    this.velocity.set(0, 0, 0)
    
    const speed = this.movement.speed * deltaTime

    // Horizontal movement (WASD)
    if (this.keys.forward) this.velocity.z -= speed
    if (this.keys.backward) this.velocity.z += speed
    if (this.keys.left) this.velocity.x -= speed
    if (this.keys.right) this.velocity.x += speed

    // Apply horizontal movement relative to camera orientation
    if (this.velocity.length() > 0) {
      this.direction.copy(this.velocity)
      this.direction.applyQuaternion(this.camera.quaternion)
      this.target.add(this.direction)
    }

    // Vertical movement (Q and E) - straight up/down in world space
    if (this.keys.down) {
      this.target.y -= speed // Q moves down
    }
    if (this.keys.up) {
      this.target.y += speed // E moves up
    }

    // Update camera position using spherical coordinates
    const position = new THREE.Vector3()
    position.setFromSpherical(this.spherical)
    position.add(this.target)
    
    this.camera.position.copy(position)
    this.camera.lookAt(this.target)
  }

  public setTarget(target: THREE.Vector3): void {
    this.target.copy(target)
  }

  public getTarget(): THREE.Vector3 {
    return this.target.clone()
  }
}
