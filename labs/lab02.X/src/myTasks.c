#include "myTasks.h"

static void taskmyLeds(void *pvParameters)
{
    xTaskParameter_t *pxTaskParameter;
    portTickType xStartTime;

    uint8_t state;
    uint8_t task_type;

    /* The parameter points to an xTaskParameters_t structure. */
    pxTaskParameter = (xTaskParameter_t *) pvParameters;

    task_type = pxTaskParameter->usLEDNumber;
    state = 0;

    while (1)
    {
        /* Note the time before entering the while loop.  xTaskGetTickCount()
        is a FreeRTOS API function. */
        xStartTime = xTaskGetTickCount();

        /* Loop until pxTaskParameters->xToggleRate ticks have */
        while ((xTaskGetTickCount() - xStartTime) < pxTaskParameter->xToggleRate);

        //do the actual LED manipulation
        switch(task_type)
        {
            case 0:
                switch(state)
                {
                    case 0:
                        setLED(0, 1);
                        setLED(1, 0);
                        setLED(2, 0);
                        state = 1;
                        break;
                    case 1:
                        setLED(0, 0);
                        setLED(1, 1);
                        setLED(2, 0);
                        state = 2;
                        break;
                    case 2:
                        setLED(0, 0);
                        setLED(1, 0);
                        setLED(2, 1);
                        state = 0;
                        break;
                    default:
                        setLED(0, 0);
                        setLED(1, 0);
                        setLED(2, 0);
                }
                break;
            case 1:
                switch(state)
                {
                    case 0:
                        setLED(0, 0);
                        setLED(1, 0);
                        setLED(2, 1);
                        state = 1;
                        break;
                    case 1:
                        setLED(0, 0);
                        setLED(1, 1);
                        setLED(2, 0);
                        state = 2;
                        break;
                    case 2:
                        setLED(0, 1);
                        setLED(1, 0);
                        setLED(2, 0);
                        state = 0;
                        break;
                    default:
                        setLED(0, 0);
                        setLED(1, 0);
                        setLED(2, 0);
                }
                break;
            case 2:
                switch(state)
                {
                    case 0:
                        setLED(0, 1);
                        setLED(1, 0);
                        setLED(2, 0);
                        state = 1;
                        break;
                    case 1:
                        setLED(0, 0);
                        setLED(1, 1);
                        setLED(2, 0);
                        state = 2;
                        break;
                    case 2:
                        setLED(0, 0);
                        setLED(1, 0);
                        setLED(2, 1);
                        state = 3;
                        break;
                    case 3:
                        setLED(0, 0);
                        setLED(1, 1);
                        setLED(2, 0);
                        state = 0;
                        break;
                    default:
                        setLED(0, 0);
                        setLED(1, 0);
                        setLED(2, 0);
                }
                break;
            default:
                toggleLED(7);
        }
    }
}


