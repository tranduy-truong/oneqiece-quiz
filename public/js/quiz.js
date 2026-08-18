/**
 * One Piece Quiz - Instant Feedback & Larper Test
 */

// Hình ảnh loading có thể tùy chỉnh dễ dàng tại đây (URL ảnh hoặc GIF)
const CUSTOM_LOADING_IMAGE =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxISEhUTExIWFRUWGBgYFRYYFRUXGBgVGBkYGBgXGBUYHSggGBolGxgXITEhJSkrMC4uFx8zODMtNygtLisBCgoKDg0OGxAQGyslICYtLTUwLS8tLS0tLS0vLS0tLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIASwAqAMBIgACEQEDEQH/xAAcAAABBQEBAQAAAAAAAAAAAAAFAAMEBgcCAQj/xABOEAABAgMDBwgFCAgFAwUBAAABAgMABBEFEiEGEzFBUWFxByIygZGhscEUI2JygjNCUpKistHwCBUkNENzwuFEU2OD8ZOj0mR0s8PTJf/EABsBAAIDAQEBAAAAAAAAAAAAAAIDAAQFAQYH/8QANREAAgECBAQDBQgCAwAAAAAAAAECAxEEEiExBTJBcRNRYSJCgZGxI1KhwdHh8PEUMwYVQ//aAAwDAQACEQMRAD8Afs5eEWGSFRFRsx6LbY4qI+f4yOXU9rXVqaYUYbiQpEdspwjpcYkpXZjyndjAh9tUcBEdoTAyZyTTHlE0whtaaw6mOTC0KR6gw4XAASTQAEknQANJMMiKhyt2kWbMcSlRSt5SGU013jVaa6gUJWOuH4bDvEVo0l1aQuporlMyg5ans6pMmy1mgSErdCypftXQpISNxqfCO8nuWlwuJROMt3CQC41eBQD84oUVXhwIw2xmOUASJhxKBRKCGwP5aQgnrKSeuPMn5H0iaYY/zXW0HGmClAHHVgY+h/8ASYDw8nhrbfr3uUPFnfc+qXVAgEGoIqCNBB0GIS3KQHyMfUizZZLhBWlu7gai6lRSnHZdCYU7NK1GnCPDf4rjVlT8m1fszewtN1EmFTMxIlnaxTFz7gPS7YsNkTV4DUdYg6+FcI3LVfCOELljbhqYdpHSF4RAnlxnQheRmU4XkRJybgYufAOkdsD7XmiTQHCBzCKxuUcKst2b9DCRyXZYDPjaO2FAN5OEew1YaI+OEi0DLLMXqyOiIodjnERfLM6AicR2KuId6KCqnqRyl/GA1pTpGCTEaUecUcV07KxmRwt45mU44RuGZluaxh65ECzlHWonjBEGM+osrsZ1RZZWOSmOFRIirZXZTsyEoh4sZ0h1tDt1VxYS6hTl8KHCgBwJEaHDOGzx0pRjJJpdREqqhuHxFF5S5ZTzsg1QKbXNsJUMK4qVeorSnmjEiJ+TmX0lOm424pKzgEOBKXTwCSUufDj7NMY6yvQEITMo54lFJfcAoatqqyqm8IW6ob2xGjw7B18JxCEakdde2z1TJOcJ027mAT4aS7NBwLU5fUlo1FL2c5ylnSeaDSms7okWJJhcwvMKJCEKLZUKKvLutN6DzVZx1FDqIBiJlKmk3MAKChnnKKGhQKyQobiKHri2cmlmlZUkEBbwJFQCAxLqS8tVDpKnENoTTRzzpSI95J2jcoLc2OwbNEvLNM4KzaQi+B0ruF4V1E146Y7mUihidaEy20kqWoJABOJAAA0kkkADeaARTbKy+ZetBthlIcQgOOPPGtwJaaWs5pJoVG8AM4ocEjSfA4LBV8fVlUStFttvp2Xma/8AkxoxXVhF6WBJqnjUUI6jiIck2ygwrEtBc3Ly8y5QrdZSpZAABWFuIJoNyUjqh2ZUAaRMVTdKtKje9jSoYh1qa9QgmdNIhTkwTriGqZjxtwKNDFWNBR1sHGgovNYFzjRJwEOyUko6jBpErUwRlZOG1MXljYdUxuWNkVeelCBoj2LJaEthCgqOLvEKhjLx1Mtsl2hEXWTnKJptiiSSaRZZJ3CNLGU1IVQkpxysJvqrjEJE5RUevu4UiCE4xXhTVtTQp01bUtln2jgMILsz4MU6VcpElE0QaxQrYRSbsZ9bBxk9C5ImaxlWU0yJmYtWSNf3KXeb/mSraHaAbSlax1ReWpyqVFOkAmmuoEZRJTanLfcfQkqZDy2VrHQDRQqXBKtGKcQNcbf/ABmjklVfb8zz+Pp5GkZuDGtZZTD8jY7Uo86tczM3XHypZUpLVeY0VE1phT4VbYySNFs7I+YmfR0Tz91S0ozLAIXMFkJwUsHmsNJTU3l40rQE0EeqqLYowM6i48m9qlqcacWapQUINdTSryFDhRRMXG1MmcnJZLN92ZIfCyhy/gUtm6XDRHQUQbpCTephhSIdl2Vk2sqLdozDJ0EOBNDvSSziOJrugJzzRaSfyOwVpXZTst1TaZt2VfdcXml3UJJwKf4agkYVKCDWlcYn5AtXHJ0g1KbOnCDsN255xZrasuyAtc2bV9MdSm8G3Diu4BRIWmlFUFANFaRSpy1WnVgSqFyt5tbbl1QotKiDcNLou6cPGOwnsktCON9bmq8lk7nbNZSDzmi6yquo386j7LqvqGLOZYDedpjD8lLYm7OUvMhC0OFJUlV6lU1oQQcFUUoa8FRbH+U+ZIwkkg0wOeBFetOjdp3iPNcT4ZWrYl1KNrO19ba7GhhcUqcMsi+rYrCTZ4O7hGbyPKVNC9nZVs1HMLbhFD7QWpd4cKHjBuW5Umx05J/ikoP5wijW4VjKfKk+z/WxcXEY20ujRpSWoBWJ6UARn8pysSRwWxNN7y0CPsqJ7oemuVezUioU6o7AyoH7VBGTPheOcreGynOvGT3LZaChSFAactdC20uNm+lYCkkaCCKiFBUcNPLqjWw+Hk4XRQpWXg5LMYQ3LS9IJsojWrVS7Gl4auyItuOmJIq0CCkvKVx1QWl5TdFKpi8iOVMXkVkAkyAAxPkIFG1ms+ZdDTrq04uFCRRobXFLUlLYwPSUKUgzlTaZlylDbDjzh511FEpFK0LjpqGxUGlBeNMKaYraLFdVNy0tNqbzCjMrVKMBSGAZcIIUo1vPKKyqql1rd3xr8Nwar0/Fq7PZfn5/TuY2J4nUTywYJyh5QmmCUSwzixUFQVVsHHELGKx7tPeiuN2it+TmpxxRW+262hCa3W2kvpcvOobTgXKpu3jovVxNDAHK2UDM9NNBISlD7qUpAoAkLVdAA0ClIbs+0LjEy0dDqW6e+hxKh9krj0eGwlKgvs18epk1sRUrO83cjyV7G6i8ThU6B+eMXmXtRLxQ1UMvzrjbM68Vc5LCEtJuNgCoS5RRO0gJ0YmvehkIupWQQNQArUAmp0gYwJmGU0oiq1DFah0aa/8AmGKSkwGmkW7LxBmEvTpSttLcyJJhkigaZZbJuqSRVKjVJptv9Qix7OkHZVednMxN5wZsLQ4prN0xvKQhRCiSTX2RtiJK5QzCSoLUXUOICHW3CVJcQnFN7XeTpSvSmgoaYREs2VvG8QSlONAAa01UOkbYPliDuyxWrZVlS7PMnVTUyUkXUNqQylSiAFFaheISLxoAakDRoI60rPkytpEo845zKvLUiib2HQTQKpWunaIkuOtITeKRStK3EnGldRgfLSwezqhhiLhGGJ3dkKU29XdBuNtBGxVjorHYpPlHos98fxQPjUIGKWtJIvGoNNJ1R6JpwfPV9YweWfn+AN4+QRUzNDQoqG5YPjHgVND5pPwJPlEZmbfPRKldV7xEEWPSDpCOtIP3RAtNb2Oqz2uMpnnxpa+woeEOC2iOk0RwUodxh8CZJohsOU1N3ir6qTWJ1nyc666hn0R4LX0QpBAoNKiVpwSNZrCpSgld2+dg9fN/IvfJ0r0iSJ5wCXVJTU1wolRx4qMKLpk/YPosuhmoKhUrUBQFasSQNmobgIUeFxOOjKtOUNm3Y3sPiZQpqNyBKyAGnGJzbA2QQZlsI9LNIqTxGZhzxLkxmVlQDhWCQASmtK7ANJJwAG8mg64bYTDNpTSWwpTlUoQhSyfZAUXFV1FKAQN6xsjmHovFV4077/QoYiq9wKyM7NEVBAU3eocColLqxwS0lhQ10dUIEJevWuwk6UyMy4r3lqWD92Jdg2kyxLGZmXW2lutvTKkqUAc68ApKUpPOV6p1pAAH8MCMvyoy5Pp7sxJqwUzmUqUk1CFKvqolWvEp6zH0OlRt7EVolYypSvuQuVti5a84Nq0q+u2hfnAiVkUJlFvrFVOOJZYFdabrjzlNwzaP907IhvvvTb5UoqdeeWMTipS1GgHbQAcIP5alLcw1JNkFEmlLJI0KfJvTC+txRTwQIupWjYAj2y2LhVUjnAKAOkUAgcuavANsppXTt/O890E7a+SX7w8oDWUgldAaYHRs4a9tN0Ipcl30GT5rI7RJrzhTgaDE/NFRTTHjMw4wq6oYA4pO3aDqh9yXdYJcSq8k6TpruUDDrT6X3EJKOaMTXTgDhX6NaQbldX3Ry3zGbTmQtCaAipJ0UBIGJ446omWGKNE7V9yRXyiJbp+TTsTXt/4iXK82WB9lavIeMLl/rSXVhLmIlmMlaXFVoolNDxJvd0RzMNDot13rNT2aImSRuS5VtKiOwIHeYDQ6OrYD0SJa7QcOg04D80iO46pWlRPEkxxCg0kgbs3fkalktSaMPWPFx87Q2FJZbruKkPEdcaOlUZ3kISh6YbOiWalJYe82hanf+6tcXMTMfPuPpzxs7dLfRGrhqTdJMnrVCgW7PDbHkZMaErbFuOHlYMoRhDLoiReiG+uERu2VoXbPUKjx9lLlEqSFVITiAcFKSD+dwhkKht+0EsguqODSHHiPZabUr713ti/gaLqYmnFfeX7/AIBVVaDZ8+8qM4h21ZotpSlCV5tISAB6pIbOA3pMVWCE42S0H11K3nXMTruhJUetSz9WB8fUDFLpybS2bW9aChzZVPqa6FTbvNZFNd3nLOy4IrKsZjEknO4kmpPO0knSYulqJ9Fbl7OFLzQExNf+5eTUJO9tq6mu1SopssgLmDTHnKIIOwkjHZwhTl7T7BpaIKT7iFktXqEqBPAAYA6KwJTJ+uCELGOhQ1a8dhFIlWjIJQ2V/OKqaTQYnR2a4ayfT64bgfw84CNowbi/7Oy1lZhWdTdacJN40pU03J1dcDLARitWxFOs/wDET7bXRn3l+ZPlDGT6OYs7VJHePxhcX9k36hvnRDt1VXiNgA7q+cT53my4HsIHaanwgVaKrzy/eI7MIKW9ggD2gOxP94Y1yIFe8yNOG6w2naAe0lR8oEwRto0UE/RAHgPKB0Np8twJbighk9Kh2aYbIqlTiAr3LwvH6tYHwVycqHHHAaZtl5Vd5bU2mm+8tMGCaRyZ2gVIm3lAjOvqXXaSLxHEXx9aLgJkqiuckdnZ+x5q6KuNTJcRtNGkVT1pvDjSDkniAY8lxjDZKzqfe/o9PwuUJ4f1QnnoUNzbZhRQhGLRsQjFotpm4hTE7qGJgK5aewxHTN74pQwdtSjTwTWrLIwonEnqitcps7mbNeXWin7rCPcUsKJ6w07jsIgrZzy3loZRpWaV+iNKldQqezbADLOYatG1ZOSbp6OwtSnjpTmpcc6uwApeR1743+BYFqpKvJbaL8/56mPxNuH2fn9DLst5cMLYldBYl2kuD/Vdq+51gu3fhGyO8gJFCn1TLybzEmgzDg1LUk0aaroqtwpFNgMCspLTM1NvzBr611axXSEqUSkdQoOqLJbDXodlsS+h2apNTG3N4plmzuulxymoqEepMcEzEytyYmXFkqWsqUo7VKCie+BNnocKqtdIDdo0a4IA89/gfuqhZNdJZ2JHj/aEuWWLfYO12hy2ScwiukqBPGhJhnJpPPUdifEj8IkZQYNNjePCGsnBQOHcPOFp/Yv+dQnzneUC/Vtjbj3f3h6xE0aTvWo9gP4REylPOQnYnzp5RNk+awnchavz2xx/6l6/udXOwHL855O9Y7zBa1ReW0nask/WA8IGWMmryOJPYCYIzi/WoP0WyvroT40hs+ddgI8oJn3bzijviPChQ9KwsUFLNFJeaXXSGmhxW4HPBlUC4MJATIKOtyZT2NNK/wD2iENL/R1yhS2+9JLNM8A41vWgG8neSjH4DGgTlkhh9afmk30DUEqJqn4TUcLu2Pmay59yXebeaVdW2pK0nek1Fdo2iPqWTygYtJhDjRo4G0OhJoK5wqbW0FHAm+gpp9K4dBFc7imFeIw7jHmWq/T4lrCYh0Z+j3B8xLjZCiUtQIqNB/OjVCjwUZySsb8KrsZp6dvh5qYrANk1MWvJCwjNvBBwaTRTyq0oj6NdRVQjgFHVHp1h80lGO7LsMfli5z2QQftT9WWa7Pn5Z8ZqUGy9Xn8ML3BCdsZzk04Zayp6dWSXH6SMuSTWi/WTBHw69tYY5UsrDaM5da/d2TmpZCRgQKArAGm8QKbgkR3ymESwlLMScJRkF6muZf8AWOcaApA2VIj0VGkqUFBdDyGJryr1XUl1AGRljicnWGFYIUurp0UaQCtw11cxKolZbWx6W+4/oDiyUDRdaQLrSaaqIujqiZkir0eRtCb0KLaJRo+1MEl2m8NNq+tFTddKgmuoUHCGNXEhIHnP8D4KEOZP9F07h5xHCvlz1dpp5w/YzyUNuFRAqQOPAa4TUXstdvyGR3Q9lKea2N57qQsnx6te9QHh+MQbZn0ulN0Gia6ddafhHtmy7i0kJXdReFdtcP7QKhakk9P7Jm9u6O8oz634R4mJweSWSkEEhqhpjQ0NanVogRastm3KVJqAanT+cIMPVTLmoxzSQeskDzjkkssUjqvdgywx6wnYhR8vOHbWcotzclKO2hPcDCsBOKz7IHaYgz719xZ1EmnDQO6GWvUfYHaBHhQoUOFig3aLV2RlPbcmXP8A4m//AKzASLBlMCliz0f+lK+tyZmD4BMQgCabKjQY4E9SQSe4GC1iZROywogmnOu0NCm+Bep8SW1jYppJ2xIyYKUJzqxzG5iXDn8pxLyXB1pFIGW3ZqpaYdYX0mlqQd900ChuIoRxiEPonJu2BacoJpkDOjmzTI0pdAxWgbFaaa67QQVGCZJZSuyDxWgm4sXHkBRTfbOmhHRWNKVDEHrBUZGJ4NQrVHPVN72sXqOPnTjlsmX2x7PW64lCE3lrNEjafIAVJOoAxauU61EWRZok2VftE1ULWMDcoA4vdXBCRsrsME2w3YlnuTr4BmFJutoOkKV0GhvwvKI1JOmmOBZW5SPWhMGYePOKUpAGhKUilBxNTxUYtYTD5Fnlu/wCxuJU34cOVfiw3yVWYhc2Zl4fs8khUy7hpLeLaeJVQ013TFWte0FzL7r7hqt1alq4qJNBuGjqi/W03+rbDZl+jMWioPPbUy6MW0HWKkpNDtWIzlpsqUEpFSogADWTgBF0zy120gtWbISwwU+t2bWD7SgwyeF1tZ+KK5NJupSgpooE17SMN34RZuU/mToaSeZLNtS7f+wkJV9u/wBsQZiXDi0KwppA23gCO+8eqFynZryDUbgoLFH99KfXrEPD8Y9eTRRANQCRXbQw5JuISqq03k7K9++C21BOHVg0omgptr1kxPs7P3KNgXVHSaadGuBy6VNNFcOEWGw3Ksn2Fd2BPiYCq7R2CgrsDWlfzhDhBVhWmjRognPtOIbN5yuCQRdGs6K7qGGMomwHAofOGPEYeFIkWlMoUz0gVFKDSuNa44dcBdtRYVrNjeT4wWd6B3knugY6sUoBheJSddNnhBKwnMCmnzga8QUxDWiiFo1oVhw0HwEHHnfwOPlRChQoUNFig/lW4VCTqKUlGh1BTlD1ih64AQdyqxEodso13Faf6YhCZksxnJK00DEpZZeHBt9AUfqrVBDL+Uz8rI2mnHPtBmYNP8QwM3eVvWlNfgMe8jzQdnHpY/4qUmGRxUkKH3K9UEOTecbmWHrFmQRnnCtgmoKH0pJpX5tSgDffMcZ1GawoN5UZMvyLl1xJuK+TcpQKGseyoaCk6I9jkJxnHNF3RJRcXZknLjLOZtJ5S3VkNBalMtfNbSQEjiqiRU7a0pWJHJfkx+sJ9ttQ9S36186s2gjmk+0aJ6zsipRsFz9S2ASebOWlgNSkMkdRFEK6lOjZBHCkcpmUQn7QeeSatJObZ2ZpGAI3E3lfFHnJnJJdtKXKx6tpRfcOoIYSXandVIHXFXi55HIzNn2nNnSWkSjewmYWM5TeG0faiEB2Uq1Ogur6ZcUpXFwlZ7yIbl3CZcFPSSlQ606PslUPK9axtKkV+JGmIFjO81xOwXh1YK7jFVXcezHPfuQHmCkJJ+cK/nqI7YaEPzczfuj6Kadesw7ZbCHFFCsKjmkaiP7RYvZXYq13ZDEy2kHmmqSKiuneDvhyRlFO1CSBQVNSfKO5uzVti9gU6KjUa0xHGFZU3m1kkE1BFB+d0cbvG8dTttdTydkFNBJJBvaKV/OuJCZH1JXUdGujHA44k4dUK1ZwOIbASoU2igOA0Q9JOnMFN1R5rgqAKajt4wDcsqb8wrK5xk+RVfFHZe/uIbmk+tfG0HxSY5sQ88jak9uB8odtHCYJ1LHimnjHP/R9ie6gTChQoeLFFmynl/2OzHvpS7rfW1MveS0xWYvVsMheT8i7/kzUwz/1Rnf6YhAfyWToZtaTWdboR/1QW/6475QJRchbExmyUqQ/nmjTReIeQRtoSB1RWpCaLTrbqek2tKxxSQoeEat+kNZ4LspOo6L7V0nVVNFp6ylz7MQhoiTL2nJturbStmaTVSD8x4AhxIIxSahRBGNQrbCjLuRXK4tOiznj6iYVzFa23yOaUnUFEAU203wo83jeF4t1nPCVMsXq1drXrt5lunVhltNXA3JDkn+sJ5N9NWGKOPbDjzG/iUOxKo45XMqPT7QWUGrLPqmthCSbyx7yqmuy7Gi2sgZPWFmUkCcm8FEHELUkZwg7EI5oI+cQdcYLHpCoKLrlCPR7HkJalFzDjs44NdPkWTwKAoxVLMklPvNso6Tq0oTxWoJHjFk5U55DloONt/JSyUSzW5LKbpH178QgMsSaCUKvHBBr8KsD34xCEtVDjgqE43N4vAY9RiEKwYZxlTuCvvJMKayu66tBp30A0dsulKgoaQax4lsmpArTE7hHMNALY4A62sDEKTeTxI/EQAsdVHkcadoIidJFTDYcJvBQrd2VIoa+UQpQoLgXeCOfUAg6NOnuitCOVSS2Gyd2mTsoOg31jwjuxTVkjYojqKfxhjO+kcw0TdNQRjWpp5xxZr6kOZnChXiaY1B1dkTK8mXqjt/auRbKXdeQd9O3DzifbiKZtWyqfqnDziLaEsGlJUDWpJ4EHRE211EthWFLyVYbFA6uIgm7yjJHErJpgV4UURsJ8Y4jt01JO+OIeKFGmZNS+fyatBAxUzMIeA2CjYUfqhcZnGucgiA+i0pNRwfYGH10E/8AcTEIZHG62m1+sclGljFyVSk8MwS2qv8AtEq7IwxxBSSkihBII2EYERt/6PFoJdYnJByhSfWBJOlDic26KbMEfWiEMRZdUhQUkkKSQUkaQQagjfWFEy3rMVKzL0uvpNOKQd90kA9YoeuPIhCxcqmVf6xn1rSast+rYFcChJNV02qNTwujVFPhQohC6clzYbfenliqJFhbwrSheIuMo4lSqj3YpzrhUoqUaqUSSTpJOJJi62mPQ7GYZpR2fcMw5or6O1zWUncpRKxFHiEJEgmq6blfdVBCT/dl/H4JMQbNPrU9naCInWd+7ufH9wfhCqn6BwG8nzz1+4fER7aUsFTAQkBNabhU4kw3YZ56/wCWryj22VlL5I0i6R2CB18V9jvuHlpsFoBF8qFcBSmjHb7UMyk+psUABFa0I10pDtotLKc4s4qPR2ClfwgfDIq8ddQW7PQmyDvPJuhVcaYbQebXSd0ezKwl+8AQAoGhFKaCcO2PLJYStd1WtJpx0iOrXbUFCqr1UihpjTfvjmme3od1y3JmUKMEnUCR9YBQ846lkZ2Xup6QFOtKqjuMdN0VLH53M7Ck+VR2Q3k87pG/uOHiBCdodmH73cCkR5HbyKKI2EjsMcRaEijROQafzVrISf4zbjfXTODvbjO4L5I2n6LOyz9aBt1ClH2Lwv8A2axCBTlSsn0W1JpulEqcLiPdd5+G4FRHVDvJNbnodqS6yaIcOZc91zAV3BV09UXf9JGyKPS02kYLQppZ1VQbyOshavqxjIMQhqn6QlhZmeRNJHNmUc7D+K3RJ7U3Owwot+Uf/wDaycRMDnPspDiqac4yCl4U9pF5QG9MKIQ+e4M5H2GqenGJZP8AEWL5+i2OctXUkGA0aJkmP1fZU1aKsHZmspKbQD8s4CNFACAdqN8QgC5R7aTNz7qm8GW6MMAaAy0Lqbu4kFXxRWIUKIQfkj6xHvJ8YJWePVOjer7ivwgSyaKSd48YL2d/FHtH7rkKq7Bw3IdlE3lUFeYrwjy00HPFJN44CujEgaBqGMd2N01e4rwjue/efiR/TEv7fwJ7pItwcwblUHeCfsjtgJBvKFWCBvWe+AkSjyEqcw/JPXFpVsIrw190FMoEc1B2FSfw7hASDc4q/LhWsXT19A+HfEmrSiyR2aHrDUC0BsUQeCh+NIg2GaLWPYNOIoY9sJyilj2b3Wk1EKWFyapqKlDqVWniIBqzkgk9EyFPCji/ePjDETbXbo5X6QB7qHvBiFDou6Qt7ihQoUEcPovKVH61yZQ8KKcbaQ7X/UY5j1PhDnbHzpG//o72qHZSYk145td8A6C26KKSN15JJ9+MWysscyc4/LH+E4pKd6NKD1pKT1xCGlfo85QhD7sg4RcfBW2D/mJFFp33kY/7cKMrse0Vyz7T7ZotpaVp4pNaHcdB4x7EIdWFZTk3MNS7Qqt1YSN1dKjuAqTuEWrlWtVtT7cjLn9nkEZhHtOCmdWd5UKfDXXEvIOlnyMzaysHDWWkgRpdWOe6K6QlOsbFCM8Uok1OJOkxCHkKFCiEPRBqy+k973/mPOAkG7J6bvEd5P4wurysOG5DsXpn3FeEOTQ/avjT5RxYnyh9xUOuCs38Y8oF877HVyrue5QHFHuk9pgTBK3DzkbkJ84GwdPlQM9xQYsvntLR71OsVHek9sB4I2I7dWRtFew18KxKivEkNzmxD60DaCO4w5aPNeSraEKPVgfCGleqf3JX9mv4GJeUDfROwqH9Q7jAPnT80EuV+h5lEjFPxDwV5mA8GLZXebbVtCe0g/hAeCpciOT3FChR02gqISkEkkAACpJOAAA0mGAFz5Hre9DtRkk0beOYc4OUCDuo4EGuysX3lxyKfmZ2XdlGi448gocSmmBb6K1E9EEKpeOHMAgTkHyNvO3X54qZRgoMpwdVrF4/wxu6XCNYt3KiTs8FK13nP8tJvuq2FaiajiowmdZLYJRbM5sDkOupSuafSpwGuaQDm8PmqcOJ1aB2wojZS8oM3NVQg5ho/NQTeI9pzA9QoOMKEOcn1HxjZdPkVLlTtRsvNyMsf2aRTmUbFu/xnDtJVhX2SdcUePSa4mPIulYUKFCiEFBmyDVS/g8RAaDFi9JfBHiIXV5WFDcZsQesV7ivKHT+9nifuxxYo9ar3VeIjs/vSt177hgJcz7BrlXcj22fWkbAkdw/GIESrTXV1Z307MPKIsNhpFC5bih6TcurSd4rw0HuhmFBM4FLdaopKtqaH3k4Hyh+eN+XCtl0njig+UKe57AVrFFf0q78euObMN9pSNfOA6xUd6Yr+6n5Md1fqMOqvS6fZJHYcO5UDYnyYvNOJ2UUO+vgIgQ6Ol0LZOsWzFzT7bDfScUEgnQB85R9kCpO4GPqHJPISRs1IU22C6E859zFejEgnBscKb6xk3IZYQW47NrHNSQykmlBhnXSa6OYgJ/3YPco2XnpN6VlVep0Ou/5nso9jadfDSitJ3sgoRuSstOUlaypmSVdQMFPfOVtzf0U+1pOqkZwpRJJJJJxJJqSdpOsxFmp1DdLxx1ClTAx63TXmow3nGnlC4029huaMQ5Ci+5d5GSjtjInLPQRdCX1ErUpSmiKOJVeNAU1rQaLisI9hqoPzAdUwuFChRYEihQoUQgoLWGecv3R3EQJgpYPSX7h8RAVOVhQ5jqxx65fBXiIcbH7S58XkI5sv5dzgv7wjpJo+8dgPimFPmfYNbLuCHl1UTtJPaY4hQosChQoUKIQNWQq+2pB1GnUsU+9QxHsZy64QcMO9Jr4VjixnKOXfpAp69I7xDk6Ah8K1KorqPS84Q17Tj5jE9EzqXTm5hSdWPZ0h3CBrqLqiNhI7IL2mKOtr+kADxBoe4wYyJyf9MtVlopqi8HXf5aBeUDuKhd+KChLq/L6HJI3XIuRRZdkN5wUKWi89XSVrF4p3kVSjqEYfMv1KnFUFSVK2CpqaDrjUuWK3cESaDpo47wHQT21V1JjCLYtC+bqeiO87eEV4xc5DE8sSLPTJcWVdg2DVEeFCi6lYQbt+j5lAHWX7NdooJBcbSaYtrwdRTZUg/GYUZDkjbipGcZmU19WsFQ+kg4LT1pJEKIQDwoUKIQUKFCiEFBKwumv+WrygbBKw+mr3FeUBU5WFDmQ9Zvy7vBf3hCc6cwd3mD5R1ID9od4K+8I8d6Uz+dSvwhXv/BB9ANChQosChQoUKIQ6bXdII0gg9kGraTebSsajT4VYjy7YBwdkznJcp13SOtOI7iOyFVNGpBw1ujmd58ulWtJB7cD3+EbByPSjbEvM2m6KJu3EHahHrF3eK1BPFEZFYjSnkFlIqtfMQNqieaOsk9kanyhWg3JystZDCgc2lGfI2gVod5VVZHuwmel4+oa1M/yxttbq3HVH1jyiT7Kdg3AUSOEU6JVpTBccJ1DADYBEWLFOOWIucrsUKFCgwRQosvJ9YxmZ1gFJLSXAVnVzaqCTxu0pHsVa+LhRdmOp0HNXC+VWRyVJ9KkuehQvFtOOB+c3u9nVq2RQzFwyEtl5hQSon0ZShf1qSK85TXtU6ouvKVyYNZn06zU8y7fWykkgt0rnGurEp7NkFCeV5JPt+5KiTWZIxmFChRYEignYHyh9xXlAyCVgn1h9xXlAVORhQ5kSpIftDvuq8Uw1MnGY94f1Q/Jj9pd90/0ww5/ieI8VQlc3wQfT5giFChRZFChQoUQgosmTdnPFN4puNqIuuOcxBIqFUJ6VBXBIJwiVkrY8sJWYn5znIaIbl2b13PvnEpJHOuJBSTSmnTEactVbi275xWE4DAITqSANApgAMBshVR3VkMgrastllzkpZqD6GFOTBFFTbqQAjChzDR6Ok85WOJ4QCcmErJWpVVKJJUTziTpJJxJMBlPrD6QVVSejWtBXAGm2sdtJuvkfTRX4hp70mEuPVsYnbYatqSr61GIPSp96A0TW5jNrWKVSbyabjriFFmCaVhMmm7ignYFiuTbobRgNK1HQlO079g1xFs2RW+4lpsVUo0GwbSTqAGMbRYNkNyjQaRjrWrWpWsnyGyBqVMqDpU879Byy7ORLNoQyKXCFAnSVg1qo66nTuwhQ5aE4hltTqzRKRU/gN5OEKKjpKpq1cuOSjoZbZbVGUkaTjxxrSLZYWXU5JJCG1Atg1CHAkpGs0NQoDgYz6WnlhopFKYgHGorsxiPZ8wpC6jXgaw50m7tlbxFZIv1srs20Vc5kSEwrHOt1VLrP+o3QFNa9JNaaTWKPbljPSjpaeTRVApJBCkrQeitChgpJ2+cPTU2VJUkgUGI04HHRjEm3rUW9KSSVhPqkvISQCCUlYVQ40wJOgCGQUkLnl6ACCFidNXuK8IHxKs94pUSKdEjHfBzV4tAR3Csp+8u+6fFMRyf3nj5qhpiaIdWqgqQdtNIhnPmjujnHHtOjthSg7/IPMvqQ4UKFDxYoUKFEIFLSttbrEvL0CGmEqupBPOWtRUtxVdKjUDcBhERc4orSs0qmlKbExGhRyyO3DNuChQsaiaHsWPE9kOz71C06NF6vUoA/wDlECZmSppKTTAJpprhUeEcKmCWQk0oKU26VfjClB2Vw3LVnVsN0cw1gd2HlEGJc88VBFaYCncIiQyOi1AluWHIewJycmUplKpUmhW7iEtpOtR3483XjG0TVlusJ56s6kDnOBN2lFqRVSQcASmtRgLwB2kLk7lOqSZSzLy7CEjEm64VKVrUtV/nK/OiH38vZhNCGmMErTQpcIIULxCgV44p7zthc45htOWQzzlFt4uOmXQeY2ed7Tn4CtONYUVSaezjillKU31FRSmoSLxqQASaDGPIZFKKsLlJydz/2Q==";

let questions = [];
let currentIndex = 0;
let userAnswers = {}; // { questionId: 'A' }
let score = 0;
let streak = 0;
let maxStreak = 0;
let correctCount = 0;
let answeredCurrent = false;

// DOM Elements
const loadingState = document.getElementById("loading-state");
const loadingImage = document.getElementById("loading-image");
const errorState = document.getElementById("error-state");
const errorMessage = document.getElementById("error-message");
const quizScreen = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");

const questionProgress = document.getElementById("question-progress");
const scoreDisplay = document.getElementById("score-display");
const streakDisplay = document.getElementById("streak-display");
const progressBar = document.getElementById("progress-bar");
const badgeCategory = document.getElementById("badge-category");
const badgeDifficulty = document.getElementById("badge-difficulty");
const questionText = document.getElementById("question-text");
const optionsContainer = document.getElementById("options-container");

const explanationBox = document.getElementById("explanation-box");
const explanationStatus = document.getElementById("explanation-status");
const explanationText = document.getElementById("explanation-text");
const explanationNote = document.getElementById("explanation-note");
const btnNext = document.getElementById("btn-next");

// Khởi chạy khi load trang
document.addEventListener("DOMContentLoaded", () => {
  if (loadingImage && CUSTOM_LOADING_IMAGE) {
    loadingImage.src = CUSTOM_LOADING_IMAGE;
  }
  loadQuestions();
});

/**
 * Tải danh sách câu hỏi từ Backend API
 */
async function loadQuestions() {
  loadingState.style.display = "flex";
  errorState.style.display = "none";
  quizScreen.style.display = "none";
  resultScreen.style.display = "none";

  try {
    const response = await fetch("/api/questions");
    const result = await response.json();

    if (response.ok && result.success && result.data.length > 0) {
      questions = result.data;
      currentIndex = 0;
      score = 0;
      streak = 0;
      maxStreak = 0;
      correctCount = 0;
      userAnswers = {};

      // Hiển thị giao diện mượt mà
      setTimeout(() => {
        loadingState.style.display = "none";
        quizScreen.style.display = "block";
        renderCurrentQuestion();
      }, 500);
    } else {
      throw new Error(result.error || "Chưa có câu hỏi nào trong hệ thống.");
    }
  } catch (err) {
    console.error("Lỗi tải câu hỏi:", err);
    loadingState.style.display = "none";
    errorState.style.display = "block";
    errorMessage.innerText =
      err.message || "Không thể kết nối đến cơ sở dữ liệu.";
  }
}

/**
 * Hiển thị câu hỏi hiện tại
 */
function renderCurrentQuestion() {
  if (questions.length === 0) return;
  answeredCurrent = false;

  const q = questions[currentIndex];

  // Cập nhật thông số
  questionProgress.innerText = `Câu ${currentIndex + 1} / ${questions.length}`;
  scoreDisplay.innerText = score;
  streakDisplay.innerText = streak;

  const progressPercent = Math.round(
    ((currentIndex + 1) / questions.length) * 100,
  );
  progressBar.style.width = `${progressPercent}%`;

  badgeCategory.innerText = q.category || "Chung";
  badgeDifficulty.innerText = `Level ${q.difficulty || 1}`;

  questionText.innerText = q.question_text;

  // Render 4 options
  optionsContainer.innerHTML = "";
  const options = [
    { key: "A", text: q.option_a },
    { key: "B", text: q.option_b },
    { key: "C", text: q.option_c },
    { key: "D", text: q.option_d },
  ];

  options.forEach((opt) => {
    const optEl = document.createElement("div");
    optEl.className = "option-item";
    optEl.dataset.key = opt.key;
    optEl.onclick = () => handleSelectOption(q.id, opt.key, optEl);

    optEl.innerHTML = `
            <div class="option-key">${opt.key}</div>
            <div class="option-text">${escapeHtml(opt.text)}</div>
        `;
    optionsContainer.appendChild(optEl);
  });

  // Ẩn bảng giải thích
  explanationBox.style.display = "none";
}

/**
 * Xử lý khi người dùng bấm chọn đáp án (Hiện ngay kết quả & giải thích)
 */
async function handleSelectOption(questionId, selectedKey, clickedElement) {
  if (answeredCurrent) return; // Khóa chọn lại
  answeredCurrent = true;

  // Khóa tất cả các nút đáp án
  const allOptions = document.querySelectorAll(".option-item");
  allOptions.forEach((el) => el.classList.add("disabled"));

  userAnswers[questionId] = selectedKey;

  try {
    const response = await fetch("/api/quiz/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_id: questionId,
        selected_answer: selectedKey,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      const isCorrect = data.is_correct;
      const correctKey = data.correct_answer;

      if (isCorrect) {
        clickedElement.classList.add("correct");
        explanationStatus.className = "explanation-status correct";
        explanationStatus.innerText = "CHÍNH XÁC!";

        correctCount++;
        streak++;
        if (streak > maxStreak) maxStreak = streak;

        // Tính điểm cộng thêm theo streak
        const pointTable = { 1: 10, 2: 20, 3: 30, 4: 50, 5: 75, 6: 100 };
        let pts = pointTable[data.difficulty] || 10;
        if (streak >= 3) pts += 10;
        score += pts;
      } else {
        clickedElement.classList.add("wrong");
        explanationStatus.className = "explanation-status wrong";
        explanationStatus.innerText = `CHƯA CHÍNH XÁC! (Đáp án đúng là: ${correctKey})`;

        // Highlight đáp án đúng màu xanh
        allOptions.forEach((el) => {
          if (el.dataset.key === correctKey) {
            el.classList.add("correct");
          }
        });

        streak = 0;
      }

      // Cập nhật hiển thị điểm và streak
      scoreDisplay.innerText = score;
      streakDisplay.innerText = streak;

      // Hiển thị lời giải thích
      explanationText.innerText =
        data.explanation || "Không có giải thích bổ sung cho câu hỏi này.";
      explanationNote.innerText = `Chủ đề: ${data.category || "Chung"} | Độ khó: Level ${data.difficulty || 1}`;

      // Nút tiếp theo
      const isLastQuestion = currentIndex >= questions.length - 1;
      btnNext.innerText = isLastQuestion
        ? "Xem Kết Quả Đánh Giá ➔"
        : "Câu Tiếp Theo ➔";

      explanationBox.style.display = "block";
    } else {
      alert(data.error || "Lỗi khi kiểm tra đáp án.");
    }
  } catch (err) {
    console.error("Lỗi check answer:", err);
    alert("Lỗi kết nối máy chủ.");
  }
}

/**
 * Chuyển sang câu hỏi tiếp theo hoặc nộp bài
 */
function nextQuestion() {
  currentIndex++;
  if (currentIndex >= questions.length) {
    finishQuiz();
  } else {
    renderCurrentQuestion();
  }
}

/**
 * Hoàn thành bài trắc nghiệm và hiển thị kết quả
 */
async function finishQuiz() {
  quizScreen.style.display = "none";
  loadingState.style.display = "flex";

  try {
    const response = await fetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: userAnswers }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      loadingState.style.display = "none";
      resultScreen.style.display = "block";

      const summary = result.summary;
      document.getElementById("result-rank").innerText = summary.rank;
      document.getElementById("result-rank-desc").innerText =
        summary.rank_message;
      document.getElementById("stat-score").innerText = summary.score;
      document.getElementById("stat-accuracy").innerText =
        `${summary.accuracy_percentage}%`;
      document.getElementById("stat-correct").innerText =
        `${summary.correct_count} / ${summary.total_questions}`;
      document.getElementById("stat-max-streak").innerText = maxStreak;

      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      throw new Error(result.error || "Có lỗi xảy ra khi tổng kết điểm.");
    }
  } catch (err) {
    loadingState.style.display = "none";
    alert(`Lỗi tổng kết: ${err.message}`);
  }
}

/**
 * Làm lại bài trắc nghiệm từ đầu
 */
function restartQuiz() {
  loadQuestions();
}

/**
 * Helper escape HTML
 */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
