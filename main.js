"use strict";

const	CHRHEIGHT	= 40;					//	キャラの高さ
const	CHRWIDTH	= 40;					//	キャラの幅
const	FONT		= "36px monospace";		//	使用フォント
const	FONTSTYLE	= "#ffffff";			//	文字色
const	HEIGHT		= 440;					//	仮想画面サイズ。高さ
const	WIDTH		= 512;					//	仮想画面サイズ。幅
const	INTERVAL	= 33;					//	フレーム呼び出し間隔
const	MAP_HEIGHT	= 32;					//	マップ高さ
const	MAP_WIDTH	= 32;					//	マップ幅
const	SCR_HEIGHT	= 16;					//	画面タイルサイズの半分の高さ
const	SCR_WIDTH	= 16;					//	画面タイルサイズの半分の幅
const	SCROLL		= 4;					//	スクロール速度
const	SMOOTH		= 0;					//	補間処理
const	START_HP	= 20;					//	開始HP
const	START_X		= 27;					//	開始位置X
const	START_Y		= 16;					//	開始位置Y
const	TILECOLUMN	= 4;					//	タイル桁数
const	TILEROW		= 4;					//	タイル行数
const	TILESIZE	= 32;					//	タイルサイズ(ドット）
const	WNDSTYLE = "rgba( 0, 0, 0, 0.75 )";	//	ウィンドウの色

const	gKey = new Uint8Array( 0x100 );		//	キー入力バッファ

let		gAngle = 0;							//	プレイヤーの向き
let		gEx = 0;							//	プレイヤーの経験値
let		gHP = START_HP;						//	プレイヤーのHP
let		gMHP = START_HP;					//	プレイヤーの最大HP
let		gLv = 1;							//	プレイヤーのレベル
let		gCursor = 0;						//	カーソル位置
let		gEnemyHP;							//	敵HP
let		gEnemyType;							//	敵種別
let		gFrame = 0;							//	内部カウンタ
let		gHeight;							//	実画面の高さ
let		gWidth;								//	実画面の幅
let		gImgBoss;							//	画像。ラスボス
let		gImgMap;							//	画像。マップ
let		gImgMonster;						//	画像。モンスター
let		gImgPlayer;							//	画像。プレイヤー
let		gItem = 0;							//	所持アイテム
let		gMessage1 = null;					//	表示メッセージ１
let		gMessage2 = null;					//	表示メッセージ２
let		gMoveX = 0;							//	移動量X
let		gMoveY = 0;							//	移動量Y
let		gOrder;								//	行動順
let		gPhase = 0;							//	戦闘フェーズ
let		gPlayerX = START_X * TILESIZE + TILESIZE / 2;	//	プレイヤー座標X
let		gPlayerY = START_Y * TILESIZE + TILESIZE / 2;	//	プレイヤー座標Y
let		gScreen;							//	仮想画面


const	gFileBoss		= "img/boss3.png";
const	gFileMap		= "img/map2.png";
const	gFileMonster	= "img/monster3.png";
const	gFilePlayer		= "img/player2.png";

const	gEncounter = [ 0, 0, 0, 1, 0, 0, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0 ];	//	敵エンカウント確率

const	gMonsterName = [ "スライム", "ドラキー", "おおきづち", "ゴースト", "おおねずみ", "西京最強魔王ネギ" ];	//	モンスター名称

//	マップ


//	戦闘行動処理
function Action()
{
	gPhase++;											//	フェーズ経過

	if( ( ( gPhase + gOrder ) & 1 ) == 0 ){				//	敵の行動順の場合
		const	d = GetDamage( gEnemyType + 2 );
		SetMessage( gMonsterName[ gEnemyType ] + "の攻撃！", d + " のダメージ！" );
		gHP -= d;										//	プレイヤーのHP減少
		if( gHP <= 0 ){									//	プレイヤーが死亡した場合
			gPhase = 7;									//	死亡フェーズ
		}
		return;
	}

	//	プレイヤーの行動順
	if( gCursor == 0 ){									//	「戦う」選択時
		const	d = GetDamage( gLv + 1 );				//	ダメージ計算結果取得
		SetMessage( "ビーグル犬の攻撃！", d + " のダメージ！" );
		gEnemyHP -= d;
		if( gEnemyHP <= 0 ){
			gPhase = 5;
		}
		return;
	}

	if( Math.random() < 0.5 ){							//	「逃げる」成功時
		SetMessage( "ビーグル犬は逃げ出した", null );
		gPhase = 6;
		return;
	}

	//	「逃げる」失敗時
	SetMessage( "ビーグル犬は逃げ出した", "しかし回り込まれた！" );
}

//	経験値加算
function AddExp( val )
{
	gEx += val * 2;											//	経験値加算
	// gEx = gEx + val;											//	経験値加算
	while( gLv * ( gLv + 1 ) * 2 <= gEx ){				//	レベルアップ条件を満たしている場合
		gLv++;											//	レベルアップ
		gMHP += 4 + Math.floor( Math.random() * 3 );	//	最大HP上昇10～12
	}
}


//	敵出現処理
function AppearEnemy( t )
{
	gPhase = 1;								//	敵出現フェーズ
	gEnemyHP = t * 4 + t ** 3 + 7;					//	敵HP
	gEnemyType = t;
	SetMessage( "敵が現れた！", null );
}


//	戦闘コマンド
function CommandFight()
{
	gPhase = 2;					//	戦闘コマンド選択フェーズ
	gCursor = 0;
	SetMessage( "　戦う", "　逃げる" );
}


//	戦闘画面描画処理
function DrawFight( g )
{
	g.fillStyle = "#333333";							//	背景色
	g.fillRect( 0, 0, WIDTH, HEIGHT );					//	画面全体を矩形描画

	if( gPhase <= 5 ){		//	敵が生存している場合
		if( IsBoss() ){	//	ラスボスの場合
			g.drawImage( gImgBoss, WIDTH / 2 - gImgBoss.width / 2, HEIGHT / 2 - gImgBoss.height / 2 );
		}else{
			let		w = gImgMonster.width / 5;
			let		h = gImgMonster.height;
			g.drawImage( gImgMonster, gEnemyType * w, 0, w, h, Math.floor( WIDTH / 2 - w / 2 ), Math.floor( HEIGHT / 2 - h / 2 ), w * 2, h * 2 );	//	
		}
	}

	DrawStatus( g );									//	ステータス描画
	DrawMessage( g );									//	メッセージ描画

	if( gPhase == 2 ){									//	戦闘フェーズがコマンド選択中の場合
		g.fillText( "⇒", 30, 355 + 46 * gCursor );		//	カーソル描画
	}
}

//	フィールド描画処理
function DrawField( g )
{

	let		mx = Math.floor( gPlayerX / TILESIZE );			//	プレイヤーのタイル座標X
	let		my = Math.floor( gPlayerY / TILESIZE );			//	プレイヤーのタイル座標Y

	for( let dy = -SCR_HEIGHT; dy <= SCR_HEIGHT; dy++ ){
		let		ty = my + dy;								//	タイル座標Y
		let		py = ( ty + MAP_HEIGHT ) % MAP_HEIGHT;		//	ループ後タイル座標Y
		for( let dx = -SCR_WIDTH; dx <= SCR_WIDTH; dx++ ){
			let		tx = mx + dx;							//	タイル座標X
			let		px = ( tx + MAP_WIDTH  ) % MAP_WIDTH;	//	ループ後タイル座標X
			DrawTile( g,
			          tx * TILESIZE + WIDTH  / 2 - gPlayerX,
			          ty * TILESIZE + HEIGHT / 2 - gPlayerY,
			          gMap[ py * MAP_WIDTH + px ] );
		}
	}

	//	プレイヤー
	g.drawImage( gImgPlayer,
	             ( gFrame >> 4 & 1 ) * CHRWIDTH, gAngle * CHRHEIGHT, CHRWIDTH, CHRHEIGHT,
	             WIDTH / 2 - CHRWIDTH / 2, HEIGHT / 2 - CHRHEIGHT + TILESIZE / 2, CHRWIDTH, CHRHEIGHT );

	//	ステータスウィンドウ
	g.fillStyle = WNDSTYLE;							//	ウィンドウの色
	g.fillRect( 2, 2, 132, 119 );						//	矩形描画

	DrawStatus( g );								//	ステータス描画
	DrawMessage( g );								//	メッセージ描画
}


function DrawMain()
{
	const	g = gScreen.getContext( "2d" );				//	仮想画面の2D描画コンテキストを取得

	if( gPhase <= 1 ){
		DrawField( g );									//	フィールド画面描画
	}else{
		DrawFight( g );
	}

/*
	g.fillStyle = WNDSTYLE;							//	ウィンドウの色
	g.fillRect( 20, 3, 105, 15 );					//	矩形描画

	g.font = FONT;									//	文字フォントを設定
	g.fillStyle = FONTSTYLE;						//	文字色
	g.fillText( "x=" + gPlayerX + " y=" + gPlayerY + " m=" + gMap[ my * MAP_WIDTH + mx ], 25, 15 );
*/
}


//	メッセージ描画
function DrawMessage( g )
{
	if( !gMessage1 ){								//	メッセージ内容が存在しない場合
		return;
	}

	g.fillStyle = WNDSTYLE;							//	ウィンドウの色
	g.fillRect( 14, 310, 480, 120 );					//	矩形描画

	g.font = FONT;									//	文字フォントを設定
	g.fillStyle = FONTSTYLE;						//	文字色
	g.fillText( gMessage1, 30, 355 );					//	メッセージ１行目描画
	if( gMessage2 ){
		g.fillText( gMessage2, 30, 401 );			//	メッセージ２行目描画
	}
}


//	ステータス描画
function DrawStatus( g )
{
	g.font = FONT;									//	文字フォントを設定
	g.fillStyle = FONTSTYLE;						//	文字色
	g.fillText( "Lv", 14, 39 );	DrawTextR( g, gLv, 108, 39 );	//	Lv
	g.fillText( "HP", 14, 75 );	DrawTextR( g, gHP, 108, 75 );	//	HP
	g.fillText( "Ex", 14, 111 );	DrawTextR( g, gEx, 108, 111 );	//	Ex
}


function DrawTextR( g, str, x, y )
{
	g.textAlign = "right";
	g.fillText( str, x, y );
	g.textAlign = "left";
}

function DrawTile( g, x, y, idx )
{
	const		ix = ( idx % TILECOLUMN ) * TILESIZE;
	const		iy = Math.floor( idx / TILECOLUMN ) * TILESIZE;
	g.drawImage( gImgMap, ix, iy, TILESIZE, TILESIZE, x, y, TILESIZE, TILESIZE );
}


//	ダメージ量算出
function GetDamage( a )
{
	return( Math.floor( a * ( 1 + Math.random() ) ) );	//	攻撃力の１～２倍
}


function IsBoss()
{
	return( gEnemyType == gMonsterName.length - 1 );
}


function LoadImage()
{
	gImgBoss    = new Image();	gImgBoss.src    = gFileBoss;	//	ラスボス画像読み込み
	gImgMap     = new Image();	gImgMap.src     = gFileMap;		//	マップ画像読み込み
	gImgMonster = new Image();	gImgMonster.src = gFileMonster;	//	モンスター画像読み込み
	gImgPlayer  = new Image();	gImgPlayer.src  = gFilePlayer;	//	プレイヤー画像読み込み
}


//function SetMessage( v1, v2 = null )	//	IE対応
function SetMessage( v1, v2 )
{
	gMessage1 = v1;
	gMessage2 = v2;
}


//	IE対応
function Sign( val )
{
	if( val == 0 ){
		return( 0 );
	}
	if( val < 0 ){
		return( -1 );
	}
	return( 1 );
}


//	フィールド進行処理
function TickField()
{
	if( gPhase != 0 ){
		return;
	}

	if( gMoveX != 0 || gMoveY != 0 || gMessage1 ){}				//	移動中又はメッセージ表示中の場合
	else if( gKey[ 37 ] ){	gAngle = 1;	gMoveX = -TILESIZE;	}	//	左
	else if( gKey[ 38 ] ){	gAngle = 3;	gMoveY = -TILESIZE;	}	//	上
	else if( gKey[ 39 ] ){	gAngle = 2;	gMoveX =  TILESIZE;	}	//	右
	else if( gKey[ 40 ] ){	gAngle = 0;	gMoveY =  TILESIZE;	}	//	下

	//	移動後のタイル座標判定
	let		mx = Math.floor( ( gPlayerX + gMoveX ) / TILESIZE );	//	移動後のタイル座標X
	let		my = Math.floor( ( gPlayerY + gMoveY ) / TILESIZE );	//	移動後のタイル座標Y
	mx += MAP_WIDTH;								//	マップループ処理X
	mx %= MAP_WIDTH;								//	マップループ処理X
	my += MAP_HEIGHT;								//	マップループ処理Y
	my %= MAP_HEIGHT;								//	マップループ処理Y
	let		m = gMap[ my * MAP_WIDTH + mx ];		//	タイル番号
	if( m < 3 ){									//	侵入不可の地形の場合
		gMoveX = 0;									//	移動禁止X
		gMoveY = 0;									//	移動禁止Y
	}

	if( Math.abs( gMoveX ) + Math.abs( gMoveY ) == SCROLL ){	//	マス目移動が終わる直前
		if( m == 8 || m == 9 ){		//	お城
			gHP = gMHP;										//	HP全回復
			SetMessage( "破壊神を倒してください！", null );
		}

		if( m == 4 || m == 5 ){		//	お城
			gHP = gMHP;										//	HP全回復
		}

		if( m == 10){	//	街
			gHP = gMHP;										//	HP全回復
			SetMessage( "西の果てにも", "村があります" );
		}

		if(m == 11 ){	//	街
			gHP = gMHP;										//	HP全回復
			SetMessage( "疲れたワン", "一休みするワン" );
		}

		if( m == 12 ){	//	村
			gHP = gMHP;										//	HP全回復
			SetMessage( "カギは、", "洞窟にあります" );
		}

		if( m == 13 ){	//	洞窟
			gItem = 1;	//	カギ入手
			SetMessage( "カギを手に入れた", null );
		}

		if( m == 14 ){	//	扉
			if( gItem == 0 ){			//	カギを保持していない場合
				gPlayerY -= TILESIZE;		//	１マス上へ移動
				SetMessage( "カギが必要です", null );
			}else{
				SetMessage( "扉が開いた", null );
			}
		}

		if( m == 15 ){	//	ボス
			AppearEnemy( gMonsterName.length - 1 );
		}

		if( Math.random() * 4 < gEncounter[ m ] ){	//	ランダムエンカウント
			let		t = Math.abs( gPlayerX / TILESIZE - START_X ) +
			          Math.abs( gPlayerY / TILESIZE - START_Y );
			if( m == 6 ){		//	マップタイプが林だった場合
				t += 16;									//	敵レベルを0.5上昇
			}
			if( m == 7 ){		//	マップタイプが山だった場合
				t += 32;								//	敵レベルを1上昇
			}
			t += Math.random() * 8;						//	敵レベルを0～0.5上昇
			t = Math.floor( t / 16 );
			t = Math.min( t, gMonsterName.length - 2 );	//	上限処理
			AppearEnemy( t );
		}
	}

	gPlayerX += Sign( gMoveX ) * SCROLL;		//	プレイヤー座標移動X
	gPlayerY += Sign( gMoveY ) * SCROLL;		//	プレイヤー座標移動Y
	gMoveX -= Sign( gMoveX ) * SCROLL;			//	移動量消費X
	gMoveY -= Sign( gMoveY ) * SCROLL;			//	移動量消費Y

	//	マップループ処理
	gPlayerX += ( MAP_WIDTH  * TILESIZE );
	gPlayerX %= ( MAP_WIDTH  * TILESIZE );
	gPlayerY += ( MAP_HEIGHT * TILESIZE );
	gPlayerY %= ( MAP_HEIGHT * TILESIZE );
}


function WmPaint()
{
	DrawMain();

	const	ca = document.getElementById( "main" );	//	mainキャンバスの要素を取得
	const	g = ca.getContext( "2d" );				//	2D描画コンテキストを取得
	g.drawImage( gScreen, 0, 0, gScreen.width, gScreen.height, 0, 0, gWidth, gHeight );	//	仮想画面のイメージを実画面へ転送
}


//	ブラウザサイズ変更イベント
function WmSize()
{
	const	ca = document.getElementById( "main" );	//	mainキャンバスの要素を取得
	ca.width = window.innerWidth;					//	キャンバスの幅をブラウザの幅へ変更
	ca.height = window.innerHeight;					//	キャンバスの高さをブラウザの高さへ変更

	const	g = ca.getContext( "2d" );				//	2D描画コンテキストを取得
	g.imageSmoothingEnabled = g.msImageSmoothingEnabled = SMOOTH;	//	補間処理

	//	実画面サイズを計測。ドットのアスペクト比を維持したままでの最大サイズを計測する。
	gWidth = ca.width;
	gHeight = ca.height;
	if( gWidth / WIDTH < gHeight / HEIGHT ){
		gHeight = gWidth * HEIGHT / WIDTH;
	}else{
		gWidth = gHeight * WIDTH / HEIGHT;
	}
}


//	タイマーイベント発生時の処理
function WmTimer()
{
	if( !gMessage1 ){
		gFrame++;						//	内部カウンタを加算
		TickField();					//	フィールド進行処理
	}
	WmPaint();
}


//	キー入力(DONW)イベント
window.onkeydown = function( ev )
{
	let		c = ev.keyCode;			//	キーコード取得

	if( gKey[ c ] != 0 ){			//	既に押下中の場合（キーリピート）
		return;
	}
	gKey[ c ] = 1;

	if( gPhase == 1 ){				//	敵が現れた場合
		CommandFight();				//	戦闘コマンド
		return;
	}

	if( gPhase == 2 ){				//	戦闘コマンド選択中の場合
		if( c == 13 || c == 90 ){	//	Enterキー、又はZキーの場合
			gOrder = Math.floor( Math.random() * 2 );	//	戦闘行動順
			Action();				//	戦闘行動処理
		}else{
			gCursor = 1 - gCursor;	//	カーソル移動
		}
		return;
	}

	if( gPhase == 3 ){
		Action();					//	戦闘行動処理
		return;
	}

	if( gPhase == 4 ){
		CommandFight();				//	戦闘コマンド
		return;
	}

	if( gPhase == 5 ){
		gPhase = 6;
		AddExp( gEnemyType + 1 );	//	経験値加算
		SetMessage( "敵をやっつけた！", null );
		return;
	}

	if( gPhase == 6 ){
		if( IsBoss() && gCursor == 0 ){		//	敵がラスボスで、かつ「戦う」選択時
			SetMessage( "魔王を倒し", "世界に平和が訪れた" );
			return;
		}
		gPhase = 0;					//	マップ移動フェーズ
	}

	if( gPhase == 7 ){
		gPhase = 8;
		SetMessage( "ビーグル犬は死亡した", null );
		return;
	}

	if( gPhase == 8 ){
		SetMessage( "ゲームオーバー", null );
		return;
	}

	gMessage1 = null;
}


//	キー入力(UP)イベント
window.onkeyup = function( ev )
{
	gKey[ ev.keyCode ] = 0;
}


//	ブラウザ起動イベント
window.onload = function()
{
	LoadImage();

	gScreen = document.createElement( "canvas" );	//	仮想画面を作成
	gScreen.width = WIDTH;							//	仮想画面の幅を設定
	gScreen.height = HEIGHT;						//	仮想画面の高さを設定

	WmSize();										//	画面サイズ初期化
	window.addEventListener( "resize", function(){ WmSize() } );	//	ブラウザサイズ変更時、WmSize()が呼ばれるよう指示
	setInterval( function(){ WmTimer() }, INTERVAL );		//	33ms間隔で、WmTimer()を呼び出すよう指示（約30.3fps）
}
