import React, { useState, useEffect } from "react";
import Balance from "@/components/Balance";
import LightningButtons from "@/components/buttons/LightningButtons";
import EcashButtons from "@/components/buttons/EcashButtons";
import { CashuMint, CashuWallet, getEncodedToken } from '@cashu/cashu-ts';


export default function Connect() {
  const wallet = new CashuWallet(new CashuMint(process.env.NEXT_PUBLIC_CASHU_MINT_URL!));
  const [balance, setBalance] = useState(0);

  // Function to update balance
  const updateBalance = () => {
      const proofs = JSON.parse(window.localStorage.getItem('proofs') || '[]');
      const newBalance = proofs.map((proof: any) => proof.amount).reduce((a: any, b: any) => a + b, 0);
      setBalance(newBalance);
  };

  // Initial balance load
  useEffect(() => {
      updateBalance();
  }, []);

  return (
      <main className="w-full h-full p-4">
          <Balance balance={balance} />
          <div className="py-8">
              <LightningButtons wallet={wallet} updateBalance={updateBalance} />
              <EcashButtons wallet={wallet} />
          </div>
      </main>
  );
}