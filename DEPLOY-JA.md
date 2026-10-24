# BINSHOTの限定公開手順

2026年10月25日時点のGitHub / Cloudflare公式ドキュメントをもとにしています。画面の言語によってボタン名が多少異なります。ゲームのプレーはiPhoneのSafariでも可能な構成です。初回の公開設定はPCのほうが操作しやすいですが、1ファイル版ならスマートフォンからのアップロードもできます。

## 1. GitHubにPrivateリポジトリを作る

1. https://github.com/new を開き、Repository nameを`binshot`などにする。
2. Visibilityを **Private** にする。Add READMEを有効にして作成する。
3. ゲームを次のいずれかでアップロードする。

### 手軽な方法：1ファイル版

1. ダウンロードした`BINSHOT-play.html`を、ファイルアプリ等で **index.html** に改名する。`index.html.txt`や`index.html.html`にならないようにする。
2. GitHubのリポジトリのトップで **Add file → Upload files** を選び、`index.html`をアップロードしてCommit changesする。スマートフォンで操作が表示されない場合はSafariの「デスクトップ用Webサイトを表示」を使う。
3. GitHubでREADMEと同じ階層に`index.html`が見えることを確認する。ゲームに必要なCSSとJavaScriptはすべてこのファイルに含まれている。

### 編集しやすい方法：ソース一式

1. `BINSHOT.zip`を解凍し、その中の`BINSHOT-source`フォルダーを開く。
2. PCのGitHub画面で **Add file → Upload files** を選び、`BINSHOT-source`フォルダーの**中身**をドラッグしてCommit changesする。ZIPファイル自体はアップロードしない。
3. リポジトリ直下に`dist`フォルダー、`package.json`、`README.md`が並び、`dist/index.html`があることを確認する。

通常のゲーム運用では1ファイル版とソース版のどちらか一方を選びます。ソース版を変更した場合は`dist/`が公開対象です。別途作った1ファイル版が自動更新されるわけではありません。

## 2. Cloudflare PagesをGitHubと接続する

1. https://dash.cloudflare.com/ にログインする。
2. **Workers & Pages → Create application → Pages → Import an existing Git repository** を選ぶ。Workersのコード生成・Workerデプロイではなく、PagesのGit連携を使う。
3. GitHubとの接続画面で対象のPrivateリポジトリを許可し、先ほど作成した`binshot`を選ぶ。
4. ビルド設定を次のとおり入力する。

| 項目 | 1ファイル版 | ソース一式 |
| --- | --- | --- |
| Production branch | `main` | `main` |
| Framework preset | `None` | `None` |
| Build command | `exit 0` | `exit 0` |
| Build output directory | `.`（リポジトリ直下） | `dist` |
| Root directory | 空欄 | 空欄 |
| 環境変数 | 不要 | 不要 |

5. Save and Deployする。デプロイ完了後の`https://プロジェクト名.pages.dev`がゲームのURL。以後、GitHubの`main`を更新すると再デプロイされる。

**この時点ではゲームURLは通常公開状態です。Privateリポジトリはソースを隠す設定であり、ゲームURLの閲覧制限ではありません。次のAccess設定まで完了してからURLを共有してください。**

## 3. Cloudflare Accessで許可した人だけに限定する

独自ドメインなしで、まず`pages.dev`の本番URLとプレビューURLを両方保護します。

1. Pagesの対象プロジェクトを開き、**Settings → General → Enable access policy** を有効にする。画面によってはSettings内にAccess policyが直接表示される。
2. 作られたポリシーの **Manage** を開く。Zero Trust / Cloudflare Oneの初期設定が必要な場合は画面に従ってチーム名などを設定する。利用可能なプラン・人数上限は自身の契約画面で確認する。
3. **Access / Access controls → Applications** から、このPagesプロジェクトのアプリケーションを開き、**Configure** を選ぶ。
4. Public hostnameで、最初の`*.プロジェクト名.pages.dev`に含まれる**ワイルドカードのサブドメイン`*`だけを削除**し、保護対象を`プロジェクト名.pages.dev`にする。名前の重複エラーが出る場合はApplication nameを`BINSHOT production`などに変更し、保存する。
5. 同じアプリケーションのPolicyで、Actionを **Allow**、Include条件を **Emails** にし、**自分と招待したい人の完全なメールアドレスだけ**を登録する。自分のメールも含める。Everyone / Bypassは追加しない。
6. メールでログインさせる場合、Zero Trustの **Integrations → Identity providers → Add new identity provider → One-time PIN** を利用できるようにする。アプリケーションのLogin methodsでもOne-time PINを選択可能にする。相手は登録したメールに届くPINでログインする。
7. Pagesの **Settings → General → Enable access policy** をもう一度有効にする。これでプレビュー用の`*.プロジェクト名.pages.dev`を保護するアプリケーションが再作成される。
8. AccessのApplicationsに次の**2つ**があることを確認する。プレビュー側にも、手順5と同じ許可メールアドレス・ログイン方法を設定する。

| 保護するもの | ホスト名の例 |
| --- | --- |
| 本番ゲーム | `binshot-xxxx.pages.dev` |
| プレビュー・ブランチ別URL | `*.binshot-xxxx.pages.dev` |

Cloudflareの「Enable access policy」を1回オンにするだけでは、通常はプレビューだけが保護され、本番の`プロジェクト名.pages.dev`は保護されません。上記の本番設定まで行う必要があります。

独自ドメインを追加する場合は、Pagesでドメイン接続を完了した後、Zero Trustでその独自ドメインにも別途Self-hostedアプリケーションとAllowポリシーを作ってください。`pages.dev`の設定だけで独自ドメインが自動的に限定公開になるわけではありません。

## 4. 限定公開できたことを確認する

1. Safariのプライベートブラウズ、またはChromeのシークレットウィンドウで**本番URL**を開く。ゲームが直接表示されず、Cloudflare Accessの認証画面になること。
2. 許可したメールアドレスで認証するとプレーできること。
3. 許可していない別のメールアドレスではプレーできないこと。
4. Cloudflareのデプロイ詳細からプレビューURLも開き、同様に認証が必要なこと。
5. 独自ドメインを設定した場合は、そのURLでも同じ確認をする。

このゲームは静的ファイルだけで動きます。JavaScript内の簡易パスワードではなく、Cloudflare側でアクセスを制御します。一度プレーを許可した相手が保存したファイルまで回収・コピー防止する仕組みではありません。

## 5. iPhoneで遊ぶ

1. 本番URLをSafariで開く。ChatGPT内やファイルアプリ内のプレビューで動かない場合は「Safariで開く」を選ぶ。
2. Accessにログイン後、ゲームを始める。縦画面・横画面の両方に操作パネルを配置している。
3. Safariの共有メニューから「ホーム画面に追加」すると、次回アクセスしやすい。
4. サウンドは画面右上の♪で切り替える。最初のタップ後に有効。消音設定・音量も確認する。

## よくあるつまずき

| 状況 | 対処 |
| --- | --- |
| 404になる | 公開ディレクトリーに`index.html`があるか確認。1ファイル版は`.`、ソース版は`dist`。フォルダーが二重になっていないか確認する。 |
| ファイルの一覧だけ／ZIPがダウンロードされる | ZIPをそのまま置かず、解凍したファイルをアップロードする。 |
| 3Dを起動できない | WebGL 2を利用できるSafari / Chromeで開く。ファイルのプレビューからHTTPSのURLへ切り替える。 |
| 更新されない | GitHubのmainを更新したか、Cloudflareのデプロイが成功したかを確認して再読み込みする。 |
| 本番URLだけ誰でも見られる | プレビュー用のワイルドカード設定だけで止まっている可能性がある。手順3の本番用・プレビュー用の両方を確認する。 |
| 自分も入れない | Allowポリシーに自分の正しいメールが含まれるか、アプリのログイン方法とOne-time PINが有効か確認する。認証を無効化するのではなく、許可条件を修正する。 |
| 音が出ない | 画面をタップして♪をオンにし、端末の音量・消音設定を確認する。 |
| ステージ記録が消えた | 記録は端末・ブラウザー別。プライベートブラウズの終了やサイトデータ削除では保存が消える場合がある。 |

## 公式資料

- GitHub：リポジトリ作成 https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository
- GitHub：ファイルアップロード https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
- Cloudflare：静的HTMLの公開 https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
- Cloudflare：pages.dev本番URLのAccess設定 https://developers.cloudflare.com/pages/platform/known-issues/#enable-access-on-your-pagesdev-domain
- Cloudflare：プレビューのアクセス制限 https://developers.cloudflare.com/pages/configuration/preview-deployments/#customize-preview-deployments-access
- Cloudflare：One-time PIN https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/

公開設定を変更した後は、必ず手順4で本番とプレビューの認証を確認してください。
