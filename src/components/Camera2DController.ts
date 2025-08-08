import * as THREE from 'three'

export class Camera2DController {
  private camera: THREE.OrthographicCamera
  private canvas: HTMLElement
  
  private mouse = {
    x: 0,
    y: 0,
    isDown: false,
    isDragging: false,
  }

  private zoom = {
    min: 10,
    max: 100,
    speed: 0.1,
    current: 30, // Initial frustum size
  }

  private pan = {
    x: 0,
    y: 0,
    speed: 0.5,
  }

  constructor(camera: THREE.OrthographicCamera, canvas: HTMLElement) {
    this.camera = camera
    this.canvas = canvas
    this.zoom.current = 30 // Match initial frustum size from ArenaVisualizer

    this.initEventListeners()
  }

  private initEventListeners(): void {
    // Mouse events for panning
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this))
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this))
    window.addEventListener('mouseup', this.onMouseUp.bind(this))
    
    // Wheel event for zoom
    this.canvas.addEventListener('wheel', this.onWheel.bind(this))
    
    // Prevent context menu on right click
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault())

    // Keyboard events for panning (arrow keys only)
    window.addEventListener('keydown', this.onKeyDown.bind(this))
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) { // Left mouse button
      this.mouse.isDown = true
      this.mouse.isDragging = false
      this.mouse.x = event.clientX
      this.mouse.y = event.clientY
      this.canvas.style.cursor = 'grabbing'
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.mouse.isDown) {
      const deltaX = event.clientX - this.mouse.x
      const deltaY = event.clientY - this.mouse.y

      // Only start dragging if we've moved enough to avoid accidental panning
      if (!this.mouse.isDragging && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
        this.mouse.isDragging = true
      }

      if (this.mouse.isDragging) {
        // Convert screen space movement to world space movement
        // Scale by zoom level and aspect ratio
        const aspect = window.innerWidth / window.innerHeight
        const panScaleX = (this.zoom.current * aspect) / window.innerWidth * this.pan.speed
        const panScaleY = this.zoom.current / window.innerHeight * this.pan.speed

        this.pan.x -= deltaX * panScaleX
        this.pan.y -= deltaY * panScaleY // Invert Y for natural panning

        this.updateCameraPosition()
      }

      this.mouse.x = event.clientX
      this.mouse.y = event.clientY
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) { // Left mouse button
      this.mouse.isDown = false
      this.mouse.isDragging = false
      this.canvas.style.cursor = 'grab'
    }
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault()
    
    // Zoom in/out
    const zoomDelta = event.deltaY * this.zoom.speed
    this.zoom.current = Math.max(this.zoom.min, Math.min(this.zoom.max, this.zoom.current + zoomDelta))
    
    this.updateCameraFrustum()
  }

  private onKeyDown(event: KeyboardEvent): void {
    // Pan with arrow keys only
    const panAmount = this.zoom.current * 0.05 // Pan amount relative to zoom level

    switch (event.code) {
      case 'ArrowLeft':
        this.pan.x -= panAmount
        this.updateCameraPosition()
        event.preventDefault()
        break
      case 'ArrowRight':
        this.pan.x += panAmount
        this.updateCameraPosition()
        event.preventDefault()
        break
      case 'ArrowUp':
        this.pan.y -= panAmount
        this.updateCameraPosition()
        event.preventDefault()
        break
      case 'ArrowDown':
        this.pan.y += panAmount
        this.updateCameraPosition()
        event.preventDefault()
        break
    }
  }

  private updateCameraFrustum(): void {
    const aspect = window.innerWidth / window.innerHeight
    const frustumSize = this.zoom.current
    
    this.camera.left = frustumSize * aspect / -2
    this.camera.right = frustumSize * aspect / 2
    this.camera.top = frustumSize / 2
    this.camera.bottom = frustumSize / -2
    
    this.camera.updateProjectionMatrix()
  }

  private updateCameraPosition(): void {
    // Update camera position based on pan values
    // Keep the camera looking down from above
    this.camera.position.set(this.pan.x, 50, this.pan.y)
    this.camera.lookAt(this.pan.x, 0, this.pan.y)
  }

  public update(deltaTime: number): void {
    // This method is called every frame but doesn't need to do anything
    // All updates are event-driven for 2D camera
  }

  public handleResize(): void {
    this.updateCameraFrustum()
  }

  public resetView(): void {
    this.pan.x = 0
    this.pan.y = 0
    this.zoom.current = 30
    this.updateCameraFrustum()
    this.updateCameraPosition()
  }

  public setZoom(zoom: number): void {
    this.zoom.current = Math.max(this.zoom.min, Math.min(this.zoom.max, zoom))
    this.updateCameraFrustum()
  }

  public getZoom(): number {
    return this.zoom.current
  }

  public setPan(x: number, y: number): void {
    this.pan.x = x
    this.pan.y = y
    this.updateCameraPosition()
  }

  public getPan(): { x: number; y: number } {
    return { x: this.pan.x, y: this.pan.y }
  }
}
