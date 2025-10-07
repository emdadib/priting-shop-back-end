const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupCurrencySettings() {
  try {
    console.log('💰 Setting up currency settings...');

    // Default currency settings
    const defaultSettings = [
      {
        key: 'CURRENCY',
        value: 'BDT',
        description: 'Default currency for the application',
        isPublic: true
      },
      {
        key: 'CURRENCY_SYMBOL',
        value: '৳',
        description: 'Currency symbol',
        isPublic: true
      },
      {
        key: 'CURRENCY_LOCALE',
        value: 'bn-BD',
        description: 'Currency locale for formatting',
        isPublic: true
      }
    ];

    for (const setting of defaultSettings) {
      // Check if setting already exists
      const existingSetting = await prisma.setting.findUnique({
        where: { key: setting.key }
      });

      if (existingSetting) {
        // Update existing setting
        await prisma.setting.update({
          where: { key: setting.key },
          data: {
            value: setting.value,
            description: setting.description,
            isPublic: setting.isPublic
          }
        });
        console.log(`✅ Updated setting: ${setting.key} = ${setting.value}`);
      } else {
        // Create new setting
        await prisma.setting.create({
          data: setting
        });
        console.log(`✅ Created setting: ${setting.key} = ${setting.value}`);
      }
    }

    console.log('🎉 Currency settings setup completed successfully!');

  } catch (error) {
    console.error('❌ Error setting up currency settings:', error);
    console.error('Error details:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupCurrencySettings()
  .then(() => {
    console.log('🎉 Currency setup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Currency setup failed:', error);
    process.exit(1);
  });
