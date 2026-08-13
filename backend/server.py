import sys
import os
import asyncio
from dotenv import load_dotenv
from miraie_ac import MirAIeHub, MirAIeBroker
from miraie_ac.enums import ConvertiMode, ConsumptionPeriodType

load_dotenv()

MOBILE_NUMBER = os.getenv("MOBILE_NUMBER")
PASSWORD = os.getenv("PASSWORD")

async def setup():
  # Instantiate a MirAIeHub object
  broker = MirAIeBroker()

  # Instantiate a MirAIeHub object
  hub = MirAIeHub()

  # Intialize the hub (+91xxxxxxxxxx, password, broker)
  await hub.init(MOBILE_NUMBER, PASSWORD, broker)
  
  # Display list of available devices
  print( hub.home.devices )
  
  # Wait till connection has been established with the broker
  async def waitForClient():
    while not hasattr(broker, 'client') or getattr(broker, 'client') is None:
      await asyncio.sleep(1)
  await waitForClient()

  # Now you can run any operation on the device(s)
  # await hub.home.devices[0].set_converti_mode(ConvertiMode.C50)

  device = hub.home.devices[0]
  print("DEBUG")
  data = await hub.get_energy_consumption(device, ConsumptionPeriodType.DAILY, "12082026", "13082026")

if __name__ == "__main__":
  loop_factory = asyncio.SelectorEventLoop if sys.platform == "win32" else None

  asyncio.run(setup(), loop_factory=loop_factory)