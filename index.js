const Twit = require('twit');
const dotenv = require('dotenv');
dotenv.config();
const PolymorphWithGeneChanger = require('./contracts/PolymorphWithGeneChanger.json')
const Web3 = require("web3");
const base64 = require('node-base64-image');
const fetch = require('node-fetch');

let web3 = new Web3(new Web3.providers.WebsocketProvider(`wss://${process.env.INGURA_NETWORK}.infura.io/ws/v3/${process.env.INFURA_KEY}`));
console.log('Infura Node is listening !');

const T = new Twit({
  consumer_key: process.env.APPLICATION_CONSUMER_KEY,
  consumer_secret: process.env.APPLICATION_CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

const instance = new web3.eth.Contract(PolymorphWithGeneChanger.abi, process.env.CONTRACT_ADDRESS);
instance.events.TokenMinted({})
  .on('data', async ({returnValues}) => {
      const { tokenId, newGene} = returnValues;
      if (!tokenId) return;
      const options = { string: true, headers: { "User-Agent": "my-app" } };
      const imageUrl = 'https://timesofindia.indiatimes.com/photo/67586673.cms';
      // const metaURL = `https://polymorphmetadata.uc.r.appspot.com/token/${tokenId}`;
      // const tokenMetaData = await fetch(metaURL).then(d => d.text()).then(d => JSON.parse(d));
      const b64content = await base64.encode(imageUrl, options); // TODO:: pass tokenMetaData.image

      T.post('media/upload', { media_data: b64content }, (err, data, response) => {
        const mediaIdString = data.media_id_string;
        const altText = "Your NFT picture is amazing !";
        const metaParams = { media_id: mediaIdString, alt_text: { text: altText } }

        T.post('media/metadata/create', metaParams, (err, data, response) => {
          if (!err) {
            // now we can reference the media and post a tweet (media will attach to the tweet)
            const params = { status: `A new token has been mint with id ${tokenId}!`, media_ids: [mediaIdString] };

            T.post('statuses/update', params, (err, data, response) => {
              console.log(`Twitted for token ${tokenId}`);
            });
          }
        })
      })
  });