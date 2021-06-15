import { GenericBall } from 'assets/ball/types';
import { Asset } from 'assets/types';
import Scene from 'scene';
import { SceneEventType } from 'scene/types';
import { DEFAULT_TIME_DELTA, FORCE_DILUTION_FACTOR } from 'utils/constant';
import { Vector2D } from 'utils/vector';
import { EngineProps } from './types';

class Engine {
  scene: Scene;

  assetList: Asset[];

  grabbedAsset: Asset | null;

  guideLines: boolean;

  mousePos: Vector2D;

  constructor({ scene, guideLines = false }: EngineProps) {
    this.scene = scene;

    // array of all objects add to engine
    this.assetList = [];

    // variables to deal with mouse grabs
    this.grabbedAsset = null;
    this.mousePos = new Vector2D(0, 0);

    // if activated, helper lines will be available
    this.guideLines = guideLines;

    // Event to deal with mouse grab events
    this.scene.registerObserver(SceneEventType.MOUSE_DOWN, this.findGrabbedAsset.bind(this));
    this.scene.registerObserver(SceneEventType.MOUSE_MOVE, (x, y) => {
      this.mousePos.i = x;
      this.mousePos.j = y;
    });
    this.scene.registerObserver(SceneEventType.MOUSE_UP, (x, y) => {
      this.grabbedAsset?.unsetGrab();
      this.grabbedAsset = null;
    });
  }

  addAsset(asset: Asset): void {
    asset.setGuideLines(this.guideLines);
    this.assetList.push(asset);
  }

  findGrabbedAsset(x: number, y: number): void {
    this.assetList.forEach((asset) => {
      if (asset.shouldGrab(x, y)) {
        asset.setGrab(x, y);
        this.grabbedAsset = asset;
      }
    });
  }

  static isPenetrating(_assetL: Asset, _assetR: Asset): boolean {
    const assetL = _assetL as GenericBall;
    const assetR = _assetR as GenericBall;
    if (assetL.pos.sub(assetR.pos).mag() < assetL.radius + assetR.radius) {
      return true;
    }
    return false;
  }

  static resolvePenetration(_assetL: Asset, _assetR: Asset): void {
    const assetL = _assetL as GenericBall;
    const assetR = _assetR as GenericBall;

    const penNormalVec = assetL.pos.sub(assetR.pos);
    const penNormalUnitVec = penNormalVec.unit();

    const semiPenDist = (assetL.radius + assetR.radius - penNormalVec.mag()) / (2 * Math.SQRT2);

    assetL.pos = assetL.pos.add(penNormalUnitVec.mul(semiPenDist));
    assetR.pos = assetR.pos.add(penNormalUnitVec.mul(-semiPenDist));
  }

  static isColliding(_assetL: Asset, _assetR: Asset): boolean {
    const assetL = _assetL as GenericBall;
    const assetR = _assetR as GenericBall;
    if (assetL.pos.sub(assetR.pos).mag() === assetL.radius + assetR.radius) {
      return true;
    }
    return false;
  }

  static resolveCollision(_assetL: Asset, _assetR: Asset): void {
    const assetL = _assetL as GenericBall;
    const assetR = _assetR as GenericBall;

    const colNormalVec = assetL.pos.sub(assetR.pos);
    const colNormalUnitVec = colNormalVec.unit();

    const normalInitialVelL = colNormalUnitVec.mul(-1).dot(assetL.vel);
    const normalInitialVelR = colNormalUnitVec.dot(assetR.vel);

    const massSum = assetL.mass + assetR.mass;

    const normalFinalVelL =
      (normalInitialVelL * (assetL.mass - assetR.mass) + 2 * assetL.mass * normalInitialVelR) /
      massSum;
    const normalFinalVelR =
      (normalInitialVelR * (assetR.mass - assetL.mass) + 2 * assetR.mass * normalInitialVelL) /
      massSum;

    assetL.vel = assetL.vel
      .add(colNormalUnitVec.mul(normalInitialVelL))
      .add(colNormalUnitVec.mul(normalFinalVelL));

    assetR.vel = assetR.vel
      .add(colNormalUnitVec.mul(-1).mul(normalInitialVelR))
      .add(colNormalUnitVec.mul(-1).mul(normalFinalVelR));
  }

  renderGuideLines(): void {
    this.scene.ctx.save();
    this.scene.ctx.strokeStyle = 'green';
    this.scene.ctx.moveTo(this.grabbedAsset.grabPos.i, this.grabbedAsset.grabPos.j);
    this.scene.ctx.lineTo(this.mousePos.i, this.mousePos.j);
    this.scene.ctx.stroke();
    this.scene.ctx.restore();
  }

  render(t: number): void {
    this.scene.cleanUp();

    for (let i = 0, len = this.assetList.length; i < len; i += 1) {
      const asset = this.assetList[i];

      if (asset === this.grabbedAsset) {
        const forceVec = new Vector2D(
          this.mousePos.i - this.grabbedAsset.grabPos.i,
          this.mousePos.j - this.grabbedAsset.grabPos.j
        );
        asset.calculateNextState({
          dt: DEFAULT_TIME_DELTA,
          force: forceVec.mul(FORCE_DILUTION_FACTOR)
        });
      } else {
        asset.calculateNextState({ dt: DEFAULT_TIME_DELTA });
      }
    }

    // Detect collision here
    for (let i = 0, iLen = this.assetList.length; i < iLen - 1; i += 1) {
      const assetL = this.assetList[i];

      for (let j = i + 1; j < iLen; j += 1) {
        const assetR = this.assetList[j];

        const isPenetrating = Engine.isPenetrating(assetL, assetR);
        if (isPenetrating) Engine.resolvePenetration(assetL, assetR);

        const isColliding = isPenetrating || Engine.isColliding(assetL, assetR);
        if (isColliding) Engine.resolveCollision(assetL, assetR);
      }
    }

    // Resolve collision

    for (let i = 0, len = this.assetList.length; i < len; i += 1) {
      const asset = this.assetList[i];

      this.scene.ctx.save();
      asset.render(this.scene.ctx);
      this.scene.ctx.restore();
    }

    if (this.guideLines && this.grabbedAsset) this.renderGuideLines();
  }
}

export default Engine;

/**
 * 1. The means of interaction between objects and world is Force and Torque
 * 2. For each frame both force and torque should be nulled to 0 in order to avoid leaks
 */
