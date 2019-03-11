# MetaSite-Hammer
A metanet tool to upload static website to blockchain.

### Usage

This example upload `./public`, and `sitemap.json` is generated as sitemap for metasite-loader..

~~~javascript
const Hammer = require('metasite-hammer')
var hammer = new Hammer({
    privKey: 'A Private Key with enough satoshis'
})

hammer.throwout()
// If there are more than 25 TXs to upload, you need to wait a confirmation to upload the rest.
hammer.broadcast_continue()
~~~

#### Full Options Example

~~~javascript
var hammer = new Hammer({
    privKey: 'L4nArjTrhucfLrAEZfHg9QLXDjWbJ1DfcPSDfT2Hwk98P7Kcfn7B',
    path: './public',
    api: 'https://api.bitindex.network',
    bitdb: 'https://genesis.bitdb.network/q/1FnauZ9aUH2Bex6JzdcV4eNX7oLSSEbxtN/',
    bitdbKey: ['159bcdKY4spcahzfTZhBbFBXrTWpoh4rd3'],
})
~~~

### Install

~~~shell
npm install metasite-hammer
~~~

### What MetaSite-Hammer do?

1. Indexing all files in `path`
2. Finding out if any file already exists on chain and exclude them from uploading list.
3. Building uploading TXs. A root TX is built first for allocating satoshis to outputs for each file chunk. Then file chunk TXs are built upon root TX.
4. Now all file txid is known, save sitemap to `sitemap.json`.
5. Broadcast root TX and file chunk TXs.

### Sitemap Example

~~~json
{
    "urls": {
        "2019/03/01/The-First-Metanet-Blog/index.html": [
            "34491b5a3bd6a66bf7e19c22f4d680dd7bb895e2681ed3b926d8bc81ceca4e35"
        ],
        "2019/03/04/The-Siteloader-is-Released/index.html": [
            "50a4aabbab943a295c6a5e97d4845a10d18c8fbdf3f87f7e176a0c6676d88a88"
        ],
        "2019/03/11/Metanet应用开发/index.html": [
            "c748ecf64bbe01ad0552a62db1a91519dec5cc7a21b8314c8a1bdede9af69e07"
        ],
        "archives/2019/03/index.html": [
            "956d076dffd3940060c69ebda7d50e0faf6bf2a4d9c5a53bdfbd8a460ca27fbe"
        ],
        "archives/2019/index.html": [
            "3027b2105f82891944960ec6ccb6a12b987ec4d8a45d6495cf4f9b92c9dec880"
        ],
        "archives/index.html": [
            "0b782b4e1dce43e3301a6b87e47eab79c52316f3c225eacc08c40e48f0f9c567"
        ],
        "css/fonts/fontawesome-webfont.eot": [
            "bb6428e7da0e2d30d279afbb6a831fa998b685612c7a09ebd0aee535692db4ac"
        ],
        "css/fonts/fontawesome-webfont.svg": [
            "72e5ee805b99b1837745b043c27db0d8cd4f5ffeda4035623ab17b0e04190a68",
            "880fc7a0588f3d484756c9b0e81dc06f3a3368afa6736a13f826c00c299bc390",
            "a6c86073e80714ac2e3c1553b00afc3605a116417ad9eadcc1e784bad325cd17",
            "775114a518e2c0907659631b7637770f1fc6b7283204c85ae068c7fcae8ef5bc"
        ],
        "css/fonts/fontawesome-webfont.ttf": [
            "e2154b8b00cabf451b69107fe295d222f9b03783cb3d154ab0f053f8d73bb770",
            "527c568628508b2afe6912db898054459d5e0937edf6a4126fefdeac64a2e7f1"
        ],
        "css/fonts/fontawesome-webfont.woff": [
            "e57d22e9d7a3a3a44ad2015fa12de9a36ece6a512f60b97046bc3dcf822bf7ba"
        ],
        "css/fonts/FontAwesome.otf": [
            "7854b991ee51fcbff3d902ed9f90aa6ef0d1d81f66669f51dbe7404620165b21"
        ],
        "css/images/banner.jpg": [
            "9defd281159a9d0ba2b58f3f70b20f963ed07fa1f1c86ba50f2114f29e2cd554",
            "3ea1db51622b46518312c6f261b065d8a5a2b39cf59dcda6aeb6924f9f698b87",
            "5d73d06f3370534c6d4dcebcc31d97f46cbb438415ca8e1de9039158fe451e7c",
            "692222086cb0be799b36158209498da663b2d8cc049bd9801e8b78462a36dd82"
        ],
        "css/style.css": [
            "942312723da69e1ee57a40f21c3511c3d38a20b6d025b4429d26b1e73a81178c"
        ],
        "fancybox/blank.gif": [
            "764b2d4ec3dfc1bbb28705dc5d52e4f9461c796a608af890332accb9cd6c3209"
        ],
        "fancybox/fancybox_loading.gif": [
            "cf1322091b53fbc2213558fc976fcb90a4f373eaea3876b5f1d791f9cfb66c2d"
        ],
        "fancybox/fancybox_loading@2x.gif": [
            "f647889e5cdf0fe79475e8a7b7f78d4fce50c4e7de3f4d8994644baed292e245"
        ],
        "fancybox/fancybox_overlay.png": [
            "327297b1e6b5c857c9f0378b389abdcbe1598c127363d201da5278a2893ca7ed"
        ],
        "fancybox/fancybox_sprite.png": [
            "bbb0e6416a4d6c33781ecd70c5f8532ccb7d17ab84c81a3aa9f2bb751a22096d"
        ],
        "fancybox/fancybox_sprite@2x.png": [
            "6b5cfbc5923fa769408359ca065f2ab8ddcef4b2202923d8712852e8b8c00745"
        ],
        "fancybox/helpers/fancybox_buttons.png": [
            "6a10e48705d92687cd776171f721f6a6129d15641bb73e047ef2e3b7d3b6a1ff"
        ],
        "fancybox/helpers/jquery.fancybox-buttons.css": [
            "5f9d54907f06849ce290269ffbe90ec0274d2b35be97ff8a9f43a48907d652ae"
        ],
        "fancybox/helpers/jquery.fancybox-buttons.js": [
            "03d03c9e6c9f6ba6d319a739a4b5f93ddbb2fcabd6427e7123f22e2d790fd0dc"
        ],
        "fancybox/helpers/jquery.fancybox-media.js": [
            "d4c27f531eeee764fc9c86291bcf20787cf0fe11ad7e53ae40d6d42b80febf29"
        ],
        "fancybox/helpers/jquery.fancybox-thumbs.css": [
            "0148dfb22f8fd926f3c8af5d83b7ec374325d6c81c5a406242fbbb0d0fc49647"
        ],
        "fancybox/helpers/jquery.fancybox-thumbs.js": [
            "ef30c17f2bec318cbc2856909ca926a795d0042e0fb7544a9bdb5fed6a717182"
        ],
        "fancybox/jquery.fancybox.css": [
            "dda3ebf4db9a266de5e75238b989a88fe4ce98ebb54933b95a9a00d681c1a595"
        ],
        "fancybox/jquery.fancybox.js": [
            "94b9af9ca00b3bd05065a79822dbe6aa53c7e7e1c7adb4ba34a0ac50a2b788e4"
        ],
        "fancybox/jquery.fancybox.pack.js": [
            "89d650c27a06910c825deb3a8e6757ceb34d2cd23325e4a7c35698158725bac2"
        ],
        "index.html": [
            "9521958d3cb61c54bb090f389055d77ac7ca464d5fa3ebce3df3337bb4d9cdaa"
        ],
        "js/script.js": [
            "ecace26ba169a8fc403cd46a34084016d3edfa4b78cc407fb3fa73d720c79a17"
        ]
    }
}
~~~

### Future Development

Extend Sitemap format

Write a Tutorial