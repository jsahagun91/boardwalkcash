import { MintQuote } from '@prisma/client';
import { findMintQuotesToRedeem, updateMintQuote } from '@/lib/mintQuoteModels';
import { createManyProofs } from '@/lib/proofModels';
import { findUserByPubkey } from '@/lib/userModels';
import { CashuMint, CashuWallet, Proof } from '@cashu/cashu-ts';
import { VercelRequest, VercelResponse } from '@vercel/node';

const handleTokensFound = async (quote: MintQuote, keysetId: string, proofs: Proof[]) => {
   await updateMintQuote(quote.id, { paid: true });

   const user = await findUserByPubkey(quote.pubkey);

   if (!user) {
      throw new Error('User not found');
   }

   let proofsPayload = proofs.map(proof => {
      return {
         proofId: proof.id,
         secret: proof.secret,
         amount: proof.amount,
         C: proof.C,
         userId: user.id,
         mintKeysetId: keysetId,
      };
   });

   const created = await createManyProofs(proofsPayload);

   if (created) {
      console.log('Proofs created:', created);
      return;
   }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
   const quotesToCheck = await findMintQuotesToRedeem();

   for (const quote of quotesToCheck) {
      const keyset = quote.mintKeyset;
      if (!keyset) {
         res.status(404).send({ success: false, message: 'Keyset not found.' });
         return;
      }

      const keys = keyset.keys.reduce(
         (acc, key) => {
            const [tokenAmt, pubkey] = key.split(':');
            acc[tokenAmt] = pubkey;
            return acc;
         },
         {} as Record<string, string>,
      );

      const wallet = new CashuWallet(new CashuMint(keyset.mintUrl), {
         keys: {
            id: keyset.id,
            keys,
            unit: keyset.unit,
         },
      });
      try {
         const { proofs } = await wallet.mintTokens(quote.amount, quote.id, {
            keysetId: keyset.id,
         });
         console.log('Proofs:', proofs);
         if (proofs.length > 0) {
            await handleTokensFound(quote, quote.mintKeysetId, proofs);
         }
      } catch (e) {
         if (e instanceof Error && e.message.includes('not paid')) {
            continue;
         }
         console.error('Error redeeming quote', quote.id, e);
      }
   }

   res.status(200).send('Done');
}
