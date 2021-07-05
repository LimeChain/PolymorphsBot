const Twit = require('twit');
const dotenv = require('dotenv');
dotenv.config();
const PolymorphWithGeneChanger = require('./contracts/PolymorphWithGeneChanger.json')
const base64 = require('node-base64-image');
const fetch = require('node-fetch');
const { ethers } = require("ethers");

const T = new Twit({
  consumer_key: process.env.APPLICATION_CONSUMER_KEY,
  consumer_secret: process.env.APPLICATION_CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

// TWITTER LIMITATIONS
// Tweets: 2,400 per day. The daily update limit is further broken down into smaller limits for semi-hourly intervals. Retweets are counted as Tweets.
const provider = new ethers.providers.InfuraWebSocketProvider(process.env.INFURA_NETWORK, process.env.INFURA_PROJECT_ID);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, PolymorphWithGeneChanger.abi, provider);

contract.on('TokenMorphed', async (tokenId, oldGene, newGene, price, eventType) => {
  const updatedGene = await contract.geneOf(tokenId);
  const formatedPrice = ethers.utils.formatEther(price);

  const tokenMorphed = updatedGene.toString() !== oldGene.toString();

  if (tokenMorphed) {
    try {
      const options = { string: true, headers: { "User-Agent": "PolymorphBot" } };
      const metaURL = `${process.env.META_DATA_URL}${tokenId}`;
      const tokenMetaRequest = await fetch(metaURL);
      const tokenDataText = await tokenMetaRequest.text();
      const tokenData = await JSON.parse(tokenDataText);
      const ownerAddress = await contract.ownerOf(tokenId);
      const b64content = await base64.encode(tokenData.image, options);

      T.post('media/upload', { media_data: b64content }, (err, data, response) => {
        const mediaIdString = data.media_id_string;
        const altText = "Your NFT picture is amazing !";
        const metaParams = { media_id: mediaIdString, alt_text: { text: altText } }

        T.post('media/metadata/create', metaParams, (err, data, response) => {
          if (!err) {
            // now we can reference the media and post a tweet (media will attach to the tweet)
            const params = { status: `${tokenData.name} has been morphed by ${ownerAddress}, for  Price ${formatedPrice}ETH ! ${tokenData.external_url}`, media_ids: [mediaIdString] };

            T.post('statuses/update', params, (err, data, response) => {
              console.log(`Twitted for token ${tokenId} has been morphed !`);
              if (err) {
                console.log("ERROR :: ");
                console.log(err);
              }
            });
          }
        })
      })
    } catch (e) {
      console.log('ERROR !!', e);
    }
  }
});

contract.on('Transfer', async (from, to, tokenId) => {
    try {
      const options = { string: true, headers: { "User-Agent": "PolymorphBot" } };
      const metaURL = `${process.env.META_DATA_URL}${tokenId}`;
      const tokenMetaRequest = await fetch(metaURL);
      const tokenDataText = await tokenMetaRequest.text();
      const tokenData = await JSON.parse(tokenDataText);
      const b64content = await base64.encode(tokenData.image, options);

      T.post('media/upload', { media_data: b64content }, (err, data, response) => {
        const mediaIdString = data.media_id_string;
        const altText = "Your NFT picture is amazing !";
        const metaParams = { media_id: mediaIdString, alt_text: { text: altText } }

        T.post('media/metadata/create', metaParams, (err, data, response) => {
          if (!err) {
            // now we can reference the media and post a tweet (media will attach to the tweet)
            const params = { status: `${tokenData.name} has been transfered by ${from}, to ${to} ! ${tokenData.external_url}`, media_ids: [mediaIdString] };

            T.post('statuses/update', params, (err, data, response) => {
              console.log(`Twitted for token ${tokenId} has been transfered !`);
              if (err) {
                console.log("ERROR :: ");
                console.log(err);
              }
            });
          }
        })
      })
    } catch (e) {
      console.log('ERROR !!', e);
    }
});


