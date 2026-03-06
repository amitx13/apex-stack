import { prisma, Prisma } from '@repo/db';

async function main() {
    await prisma.rechargePlan.createMany({
        data: [
            // At
            {
                operatorCode: 'AT',
                category: "Monthly_packs",
                amount: new Prisma.Decimal(319),
                data: '1.5 GB/day',
                calls: 'Unlimited',
                validity: '1 month',
                 
            },
            {
                operatorCode: 'AT',
                category: "Monthly_packs",
                amount: new Prisma.Decimal(609),
                data: '60 GB',
                calls: 'Unlimited',
                validity: '1 month',
                 
            },
            {
                operatorCode: 'AT',
                category: "Unlimited_5g_plans",
                amount: new Prisma.Decimal(349),
                data: '2 GB/day',
                calls: 'Unlimited',
                validity: '28 days',
                 
            },
            {
                operatorCode: 'AT',
                category: "Unlimited_5g_plans",
                amount: new Prisma.Decimal(379),
                data: '2 GB/day',
                calls: 'Unlimited',
                validity: '1 month',
                 
            },
            {
                operatorCode: 'AT',
                category: "Unlimited_5g_plans",
                amount: new Prisma.Decimal(398),
                data: '2 GB/day',
                calls: 'Unlimited',
                validity: '28 days',
                 
            },
            {
                operatorCode: 'AT',
                category: "Unlimited_5g_plans",
                amount: new Prisma.Decimal(399),
                data: '2.5 GB/day',
                calls: 'Unlimited',
                validity: '28 days',
                 
            },
            {
                operatorCode: 'AT',
                category: "Unlimited_5g_plans",
                amount: new Prisma.Decimal(429),
                data: '2.5 GB/day',
                calls: 'Unlimited',
                validity: '1 month',
                 
            },
            {
                operatorCode: 'AT',
                category: "Unlimited_5g_plans",
                amount: new Prisma.Decimal(449),
                data: '4 GB/day',
                calls: 'Unlimited',
                validity: '28 days',
                 
            },
            {
                operatorCode: 'AT',
                category: "Top_data_packs",
                amount: new Prisma.Decimal(39),
                data: '3 GB/day',
                calls: 'N/A',
                validity: '3 days',
                 
            },
            {
                operatorCode: 'AT',
                category: "Top_data_packs",
                amount: new Prisma.Decimal(33),
                data: '2 GB',
                calls: 'N/A',
                validity: '1 day',
                 
            },
            {
                operatorCode: 'AT',
                category: "Top_data_packs",
                amount: new Prisma.Decimal(49),
                data: 'Unlimited',
                calls: 'N/A',
                validity: '1 day',
                 
            },
            {
                operatorCode: 'AT',
                category: "Top_data_packs",
                amount: new Prisma.Decimal(100),
                data: '6 GB',
                calls: 'N/A',
                validity: '30 days',
                 
            },
            {
                operatorCode: 'AT',
                category: "Top_data_packs",
                amount: new Prisma.Decimal(161),
                data: '12 GB',
                calls: 'N/A',
                validity: '30 days',
                 
            },

            // Jio
            {
                operatorCode: 'RJ',
                category: 'Monthly_packs',
                amount: new Prisma.Decimal(299),
                data: '1.5 GB/day',
                calls: 'Unlimited',
                validity: '28 days',
                 
            },
            {
                operatorCode: 'RJ',
                category: 'Monthly_packs',
                amount: new Prisma.Decimal(239),
                data: '1.5 GB/day',
                calls: 'Unlimited',
                validity: '22 days',
                 
            },
            {
                operatorCode: 'RJ',
                category: 'Unlimited_5g_plans',
                amount: new Prisma.Decimal(349),
                data: '2 GB/day',
                calls: 'Unlimited',
                validity: '28 days',
                 
            },
            {
                operatorCode: 'RJ',
                category: 'Unlimited_5g_plans',
                amount: new Prisma.Decimal(449),
                data: '3 GB/day',
                calls: 'Unlimited',
                validity: '28 days',
                 
            },
            {
                operatorCode: 'RJ',
                category: 'Unlimited_5g_plans',
                amount: new Prisma.Decimal(198),
                data: '2 GB/day',
                calls: 'Unlimited',
                validity: '14 days',
                 
            },
            {
                operatorCode: 'RJ',
                category: 'Unlimited_5g_plans',
                amount: new Prisma.Decimal(399),
                data: '2.5 GB/day',
                calls: 'Unlimited',
                validity: '28 days',
                 
            },
            {
                operatorCode: 'RJ',
                category: 'Unlimited_5g_plans',
                amount: new Prisma.Decimal(450),
                data: '2 GB/day',
                calls: 'Unlimited',
                validity: '36 days',
                 
            },
            {
                operatorCode: 'RJ',
                category: "Top_data_packs",
                amount: new Prisma.Decimal(11),
                data: 'Unlimited',
                calls: 'N/A',
                validity: '1 Hour',
                 
            },
            {
                operatorCode: 'RJ',
                category: "Top_data_packs",
                amount: new Prisma.Decimal(19),
                data: '1 GB',
                calls: 'N/A',
                validity: '1 day',
                 
            },
            {
                operatorCode: 'RJ',
                category: "Top_data_packs",
                amount: new Prisma.Decimal(29),
                data: '2 GB',
                calls: 'N/A',
                validity: '2 days',
                 
            },
            {
                operatorCode: 'RJ',
                category: "Top_data_packs",
                amount: new Prisma.Decimal(39),
                data: '3 GB/day',
                calls: 'N/A',
                validity: '3 days',
                 
            },
            {
                operatorCode: 'RJ',
                category: "Top_data_packs",
                amount: new Prisma.Decimal(49),
                data: 'Unlimited',
                calls: 'N/A',
                validity: '1 day',
                 
            },
            {
                operatorCode: 'RJ',
                category: "Top_data_packs",
                amount: new Prisma.Decimal(103),
                data: '5 GB',
                calls: 'N/A',
                validity: '28 days',
                 
            },

            // Vi
            {
                operatorCode: 'VI',
                category: 'Unlimited_5g_plans',
                amount: new Prisma.Decimal(398),
                data: 'Unlimited',
                calls: 'Unlimited',
                validity: '28 days',
                 
            },
            {
                operatorCode: 'VI',
                category: 'Unlimited_5g_plans',
                amount: new Prisma.Decimal(399),
                data: '2 GB/day',
                calls: 'Unlimited',
                validity: '28 days',
                 
            },
            {
                operatorCode: 'VI',
                category: 'Unlimited_5g_plans',
                amount: new Prisma.Decimal(449),
                data: 'Unlimited',
                calls: 'Unlimited',
                validity: '28 days',
                 
            },
            {
                operatorCode: 'VI',
                category: 'Unlimited_5g_plans',
                amount: new Prisma.Decimal(998),
                data: '2 GB/day',
                calls: 'Unlimited',
                validity: '84 days',
                 
            },
            {
                operatorCode: 'VI',
                category: 'Unlimited_5g_plans',
                amount: new Prisma.Decimal(299),
                data: '1 GB/day',
                calls: 'Unlimited',
                validity: '28 days',
                 
            },
            {
                operatorCode: 'VI',
                category: 'Unlimited_5g_plans',
                amount: new Prisma.Decimal(349),
                data: '1.5 GB/day',
                calls: 'Unlimited',
                validity: '28 days',
                 
            },
            {
                operatorCode: 'VI',
                category: 'Unlimited_5g_plans',
                amount: new Prisma.Decimal(365),
                data: '2 GB/day',
                calls: 'Unlimited',
                validity: '28 days',
                 
            },
            {
                operatorCode: 'VI',
                category: 'Top_data_packs',
                amount: new Prisma.Decimal(22),
                data: '1 GB',
                calls: 'N/A',
                validity: '1 day',
                 
            },
            {
                operatorCode: 'VI',
                category: 'Top_data_packs',
                amount: new Prisma.Decimal(26),
                data: '1.5 GB',
                calls: 'N/A',
                validity: '1 day',
                 
            },
            {
                operatorCode: 'VI',
                category: 'Top_data_packs',
                amount: new Prisma.Decimal(33),
                data: '2 GB',
                calls: 'N/A',
                validity: '2 days',
                 
            },
            {
                operatorCode: 'VI',
                category: 'Top_data_packs',
                amount: new Prisma.Decimal(44),
                data: '1 GB',
                calls: 'N/A',
                validity: '1 day',
                 
            },
            {
                operatorCode: 'VI',
                category: 'Top_data_packs',
                amount: new Prisma.Decimal(48),
                data: '6 GB',
                calls: 'N/A',
                validity: '3 days',
                 
            },
            {
                operatorCode: 'VI',
                category: 'Top_data_packs',
                amount: new Prisma.Decimal(49),
                data: 'Unlimited',
                calls: 'N/A',
                validity: '1 day',
                 
            },
            {
                operatorCode: 'VI',
                category: 'Top_data_packs',
                amount: new Prisma.Decimal(61),
                data: '2 GB',
                calls: 'N/A',
                validity: '15 days',
                 
            },
            {
                operatorCode: 'VI',
                category: 'Top_data_packs',
                amount: new Prisma.Decimal(69),
                data: '3 GB',
                calls: 'N/A',
                validity: '28 days',
                 
            },
            {
                operatorCode: 'VI',
                category: 'Top_data_packs',
                amount: new Prisma.Decimal(89),
                data: '6 GB',
                calls: 'N/A',
                validity: '7 days',
                 
            },
            {
                operatorCode: 'VI',
                category: 'Top_data_packs',
                amount: new Prisma.Decimal(95),
                data: '4 GB',
                calls: 'N/A',
                validity: '14 days',
                 
            },
            {
                operatorCode: 'VI',
                category: 'Top_data_packs',
                amount: new Prisma.Decimal(101),
                data: '5 GB',
                calls: 'N/A',
                validity: '30 days',
                 
            },
            {
                operatorCode: 'VI',
                category: 'Top_data_packs',
                amount: new Prisma.Decimal(139),
                data: '12 GB',
                calls: 'N/A',
                validity: '28 days',
                 
            },

            // BSNL Talktime
            {
                operatorCode: 'BT',
                category: 'Talktime_plans',
                amount: new Prisma.Decimal(10),
                data: 'N/A',
                calls: 'Talktime ₹7.47',
                validity: 'NA',
                 
            },
            {
                operatorCode: 'BT',
                category: 'Talktime_plans',
                amount: new Prisma.Decimal(20),
                data: 'N/A',
                calls: 'Talktime ₹14.95',
                validity: 'NA',
            },
            {
                operatorCode: 'BT',
                category: 'Talktime_plans',
                amount: new Prisma.Decimal(50),
                data: 'N/A',
                calls: 'Talktime ₹39.37',
                validity: 'NA',
            },
            {
                operatorCode: 'BT',
                category: 'Talktime_plans',
                amount: new Prisma.Decimal(100),
                data: 'N/A',
                calls: 'Talktime ₹81.75',
                validity: 'NA',
            },
            {
                operatorCode: 'BT',
                category: 'Talktime_plans',
                amount: new Prisma.Decimal(220),
                data: 'N/A',
                calls: 'Talktime ₹220',
                validity: 'NA',
            },
            {
                operatorCode: 'BT',
                category: 'Talktime_plans',
                amount: new Prisma.Decimal(500),
                data: 'N/A',
                calls: 'Talktime ₹420.73',
                validity: 'NA',
            },
            {
                operatorCode: 'BT',
                category: 'Talktime_plans',
                amount: new Prisma.Decimal(1000),
                data: 'N/A',
                calls: 'Talktime ₹844.46',
                validity: 'NA',
            },

            // BSNL Special
            {
                operatorCode: 'BS',
                category: 'Unlimited',
                amount: new Prisma.Decimal(99),
                data: 'Unlimited data (50MB high-speed, then 40 Kbps)',
                calls: 'Unlimited',
                validity: '14 days',
                 
            },
            {
                operatorCode: 'BS',
                category: 'Unlimited',
                amount: new Prisma.Decimal(147),
                data: 'Unlimited data (5GB high-speed, then 40 Kbps)',
                calls: 'Unlimited',
                validity: '24 days',
            },
            {
                operatorCode: 'BS',
                category: 'Unlimited',
                amount: new Prisma.Decimal(225),
                data: '2.5 GB/day (then 40 Kbps)',
                calls: 'Unlimited',
                validity: '30 days',
            },
            {
                operatorCode: 'BS',
                category: 'Unlimited',
                amount: new Prisma.Decimal(247),
                data: '50 GB high-speed (then 40 Kbps)',
                calls: 'Unlimited',
                validity: '30 days',
            },
            {
                operatorCode: 'BS',
                category: 'Unlimited',
                amount: new Prisma.Decimal(299),
                data: '3 GB/day (then 40 Kbps)',
                calls: 'Unlimited',
                validity: '30 days',
            },
            {
                operatorCode: 'BS',
                category: 'Unlimited',
                amount: new Prisma.Decimal(319),
                data: '10 GB high-speed (then 40 Kbps)',
                calls: 'Unlimited',
                validity: '60 days',
            },
            {
                operatorCode: 'BS',
                category: 'Unlimited',
                amount: new Prisma.Decimal(347),
                data: '2 GB/day (then 40 Kbps)',
                calls: 'Unlimited',
                validity: '50 days',
            },
            {
                operatorCode: 'BS',
                category: 'Unlimited',
                amount: new Prisma.Decimal(439),
                data: 'Unlimited data (40 Kbps after FUP)',
                calls: 'Unlimited',
                validity: '80 days',
            },
            {
                operatorCode: 'BS',
                category: 'Unlimited',
                amount: new Prisma.Decimal(449),
                data: '5 GB high-speed (then 40 Kbps)',
                calls: 'Unlimited',
                validity: '90 days',
            },
            {
                operatorCode: 'BS',
                category: 'Unlimited',
                amount: new Prisma.Decimal(485),
                data: '2 GB/day (then 40 Kbps)',
                calls: 'Unlimited',
                validity: '72 days',
            },
            {
                operatorCode: 'BS',
                category: 'Unlimited',
                amount: new Prisma.Decimal(599),
                data: '3 GB/day (then 40 Kbps)',
                calls: 'Unlimited',
                validity: '70 days',
            },
            {
                operatorCode: 'BS',
                category: 'Unlimited',
                amount: new Prisma.Decimal(2799),
                data: '3 GB/day (then 40 Kbps)',
                calls: 'Unlimited',
                validity: '365 days',
            },

            {
                operatorCode: 'BS',
                category: 'Top_data_packs',
                amount: new Prisma.Decimal(16),
                data: '2 GB (then 40 Kbps)',
                calls: 'N/A',
                validity: '1 day',
                 
            },
            {
                operatorCode: 'BS',
                category: 'Top_data_packs',
                amount: new Prisma.Decimal(58),
                data: '8 GB (then 40 Kbps)',
                calls: 'N/A',
                validity: '7 days',
            },
            {
                operatorCode: 'BS',
                category: 'Top_data_packs',
                amount: new Prisma.Decimal(105),
                data: '20 GB (then 40 Kbps)',
                calls: 'N/A',
                validity: '7 days',
            },
            {
                operatorCode: 'BS',
                category: 'Top_data_packs',
                amount: new Prisma.Decimal(198),
                data: '40 GB (then 40 Kbps)',
                calls: 'N/A',
                validity: '30 days',
            },
            {
                operatorCode: 'BS',
                category: 'Top_data_packs',
                amount: new Prisma.Decimal(411),
                data: '100 GB (then 40 Kbps)',
                calls: 'N/A',
                validity: '60 days',
            },
        ],
        skipDuplicates: true,
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error seeding recharge Plans:', error);
      process.exit(1);
    });
